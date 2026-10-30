import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { commercialFindingsSchema, evaluationCriteriaSchema, evaluationGenerationSchema } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import { generateStructured, untrusted } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { deriveEvidenceStrength } from "../evidence"
import { computeRankScore } from "../ranking"
import { brandBrief, constraintsBrief, type DiscoveryContext } from "./context"

const SYSTEM = `You are an investment-committee style reviewer evaluating expansion hypotheses.
Assess each opportunity on every criterion with a level, a short rationale grounded in the dossier, and a basis:
- MEASURED: directly backed by Qloo data or a sourced figure in the dossier.
- MODEL_ASSESSED: your judgement from the available evidence.
- UNAVAILABLE: no evidence; use level "medium".
For risk and uncertainty, a higher level means worse. Be critical; do not inflate. Never state a success probability.`

const commercialSummary = commercialFindingsSchema.omit({ claims: true }).partial()

/**
 * Evidence counts used for the deterministic strength rating. Only claims
 * researched for this opportunity count; brand-level facts show fit, not
 * evidence that the opportunity itself holds up.
 */
export async function evidenceCounts(opportunityId: string) {
  const refs = await db.evidenceReference.findMany({
    where: { opportunityId },
    include: { claim: { select: { status: true, opportunityId: true } } },
  })
  const own = refs.filter((r) => r.claim?.opportunityId === opportunityId && r.claim.status === "VERIFIED")
  return {
    qlooRelationships: refs.filter((r) => r.relationshipId).length,
    verifiedClaims: own.filter((r) => r.role === "SUPPORTS").length,
    contradictingClaims: own.filter((r) => r.role === "CONTRADICTS").length,
  }
}

export async function evaluateOpportunities(job: JobContext, ctx: DiscoveryContext, opportunityIds: string[]) {
  if (!opportunityIds.length) return
  await job.stage("evaluate", `Evaluating ${opportunityIds.length} opportunities against explicit criteria`)
  const opps = await db.opportunity.findMany({
    where: { id: { in: opportunityIds } },
    include: { claims: { select: { statement: true, status: true } } },
  })
  const counts = new Map(await Promise.all(opps.map(async (o) => [o.id, await evidenceCounts(o.id)] as const)))

  const dossiers = opps.map((o, i) => {
    const c = counts.get(o.id)!
    const commercial = commercialSummary.safeParse(o.commercial ?? {})
    return [
      `O${i + 1}: ${o.title} [${o.category}]`,
      `Hypothesis: ${o.hypothesis}`,
      `Mechanism: ${o.mechanism}`,
      `Evidence: ${c.qlooRelationships} Qloo relationships; ${c.verifiedClaims} verified supporting claims; ${c.contradictingClaims} verified contradicting claims`,
      o.commercialAt && commercial.success
        ? `Commercial research: competitors ${commercial.data.competitors?.map((x) => x.name).join(", ") || "none found"}; costs: ${commercial.data.costs ?? "n/a"}; licensing: ${commercial.data.licensing ?? "n/a"}; market: ${commercial.data.marketConditions ?? "n/a"}`
        : "Commercial research: not performed for this opportunity",
      o.claims.length ? `Commercial claims:\n${o.claims.map((cl) => `  - [${cl.status}] ${cl.statement}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  })

  const out = await generateStructured({
    ctx: job.usage("discovery.evaluate"),
    model: MODELS.reasoning,
    schema: evaluationGenerationSchema,
    system: SYSTEM,
    prompt: [brandBrief(ctx), constraintsBrief(ctx.config), untrusted("opportunity_dossiers", dossiers.join("\n\n"))].join(
      "\n\n",
    ),
    effort: "medium",
  })

  for (const ev of out.evaluations) {
    const index = Number(ev.alias.replace(/\D/g, "")) - 1
    const opp = opps[index]
    if (!opp) continue
    const strength = deriveEvidenceStrength(counts.get(opp.id)!)
    const rankScore = computeRankScore(ev.criteria, strength)
    await db.$transaction([
      db.opportunityEvaluation.create({
        data: {
          opportunityId: opp.id,
          criteria: ev.criteria as unknown as Prisma.InputJsonValue,
          rankScore,
          model: MODELS.reasoning,
        },
      }),
      db.opportunity.update({ where: { id: opp.id }, data: { evidenceStrength: strength } }),
    ])
  }
  await rerank(job.projectId)
}

/**
 * Ranks all active opportunities in the project. Evidence strength and score are
 * recomputed from stored criteria and current evidence, so opportunities from
 * earlier iterations are ranked by exactly the same rules as new ones.
 */
export async function rerank(projectId: string) {
  const opps = await db.opportunity.findMany({
    where: { projectId, status: "CANDIDATE" },
    include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  const scored = await Promise.all(
    opps.map(async (o) => {
      const strength = deriveEvidenceStrength(await evidenceCounts(o.id))
      const evaluation = o.evaluations[0]
      const criteria = evaluationCriteriaSchema.safeParse(evaluation?.criteria)
      const score = criteria.success ? computeRankScore(criteria.data, strength) : -1
      return { id: o.id, strength, score, evaluationId: evaluation?.id }
    }),
  )
  scored.sort((a, b) => b.score - a.score)
  await db.$transaction(
    scored.flatMap((o, i) => [
      db.opportunity.update({ where: { id: o.id }, data: { rank: i + 1, evidenceStrength: o.strength } }),
      ...(o.evaluationId && o.score >= 0
        ? [db.opportunityEvaluation.update({ where: { id: o.evaluationId }, data: { rankScore: o.score } })]
        : []),
    ]),
  )
}
