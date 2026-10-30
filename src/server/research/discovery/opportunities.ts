import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { opportunityGenerationSchema, type GeneratedOpportunity } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import type { UsageContext } from "@/server/usage/record"
import { generateStructured, untrusted } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { dedupeKey, dedupeOpportunities, resolveAliases } from "../ranking"
import { brandBrief, claimTable, constraintsBrief, type DiscoveryContext } from "./context"
import { relationshipTable } from "./cultural"

const SYSTEM = `You are a senior growth strategist. You turn cultural intelligence into concrete commercial expansion hypotheses.

For each opportunity:
- Ground it in the evidence: cite the R# (Qloo relationship) and I# (cultural insight) aliases that make it culturally relevant, and S# brand claims that make it a fit.
- State a plausible commercial mechanism: who pays whom, for what.
- Name specific potential partners. A partner is always a proposal; never imply a partnership exists unless an S# claim says so.
- List real risks and the unknowns that must be validated.

Rules:
- Not every cultural connection is an opportunity. Only propose ideas with a credible way to make money.
- Cultural affinity means shared taste. It does not predict revenue, purchase probability or partnership success. Do not claim otherwise.
- Respect the analysis constraints exactly, including exclusions.
- Prefer specific, non-obvious ideas over generic ones. 6-8 opportunities, spread across categories where the evidence allows.`

export type GenerationResult = { opportunityIds: string[]; dropped: number }

/**
 * Generate hypotheses without persisting them. `includeCultural: false` is the
 * LLM-only arm of the Qloo ablation: identical inputs minus Qloo evidence.
 */
export async function draftOpportunities(
  job: { projectId: string; usage: (operation: string) => UsageContext },
  ctx: DiscoveryContext,
  opts: { includeCultural: boolean; includeHistory?: boolean },
) {
  const [rels, claims, insights] = await Promise.all([
    opts.includeCultural ? relationshipTable(job.projectId) : null,
    claimTable(job.projectId),
    opts.includeCultural
      ? db.culturalInsight.findMany({ where: { projectId: job.projectId }, orderBy: { createdAt: "asc" } })
      : [],
  ])
  const insightAliases = new Map(insights.map((ins, i) => [`I${i + 1}`, ins.id]))
  const insightText = insights.map((ins, i) => `I${i + 1} ${ins.title}: ${ins.summary}`).join("\n")
  // History is omitted in the ablation: earlier titles were produced with Qloo evidence.
  const existing =
    opts.includeHistory === false
      ? []
      : await db.opportunity.findMany({ where: { projectId: job.projectId }, select: { title: true, status: true } })

  const prompt = [
    brandBrief(ctx),
    constraintsBrief(ctx.config),
    rels ? untrusted("qloo_relationships", rels.text || "(none)") : "",
    insightText ? untrusted("cultural_insights", insightText) : "",
    untrusted("brand_claims", claims.text || "(none)"),
    existing.length
      ? untrusted(
          "previous_opportunities",
          existing.map((o) => `${o.status === "EXCLUDED" ? "[excluded by user] " : ""}${o.title}`).join("\n"),
        )
      : "",
    existing.some((o) => o.status === "EXCLUDED")
      ? "Do not propose opportunities similar to those the user excluded."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const out = await generateStructured({
    ctx: job.usage("discovery.generate"),
    model: MODELS.reasoning,
    schema: opportunityGenerationSchema,
    system: opts.includeCultural
      ? SYSTEM
      : `${SYSTEM}\n\nNo Qloo evidence is available in this run. Cite only S# claims.`,
    prompt,
    effort: "high",
  })
  return { opportunities: dedupeOpportunities(out.opportunities), rels, claims, insightAliases }
}

export async function generateOpportunities(
  job: JobContext,
  ctx: DiscoveryContext,
  opts: { includeCultural: boolean } = { includeCultural: true },
): Promise<GenerationResult> {
  await job.stage("generate", "Generating commercial hypotheses from the evidence")
  const { opportunities, rels, claims, insightAliases } = await draftOpportunities(job, ctx, opts)

  const excludedKeys = new Set(
    (await db.opportunity.findMany({ where: { projectId: job.projectId, status: "EXCLUDED" }, select: { dedupeKey: true } })).map(
      (o) => o.dedupeKey,
    ),
  )

  let dropped = 0
  const ids: string[] = []
  for (const opp of opportunities) {
    const relIds = rels ? resolveAliases(opp.culturalEvidence, rels.aliases) : []
    const insIds = resolveAliases(opp.culturalEvidence, insightAliases)
    const claimIds = resolveAliases(opp.brandEvidence, claims.aliases)
    const key = dedupeKey(opp.category, opp.title)
    if ((opts.includeCultural && relIds.length + insIds.length === 0) || excludedKeys.has(key)) {
      dropped++
      continue
    }
    ids.push(await persistOpportunity(job, ctx, opp, key, { relIds, insIds, claimIds, targets: rels?.targets }))
  }
  await job.note(
    "generate",
    `${ids.length} evidence-backed hypotheses${dropped ? `; ${dropped} discarded for missing Qloo evidence or prior exclusion` : ""}`,
    "SUCCESS",
  )
  return { opportunityIds: ids, dropped }
}

async function persistOpportunity(
  job: JobContext,
  ctx: DiscoveryContext,
  opp: GeneratedOpportunity,
  key: string,
  evidence: { relIds: string[]; insIds: string[]; claimIds: string[]; targets?: Map<string, string> },
) {
  const partners = opp.partners.slice(0, 6).map((p) => ({
    name: p.name,
    role: p.role,
    qlooEntityId: p.alias ? (evidence.targets?.get(p.alias.trim().toUpperCase()) ?? null) : null,
    status: "proposed" as const,
  }))
  const data = {
    constraintsId: ctx.constraintsId,
    title: opp.title.slice(0, 160),
    category: opp.category,
    summary: opp.summary,
    hypothesis: opp.hypothesis,
    mechanism: opp.mechanism,
    nextAction: opp.nextAction,
    partners: partners as Prisma.InputJsonValue,
    risks: opp.risks.slice(0, 8),
    unknowns: opp.unknowns.slice(0, 8),
  }
  const row = await db.opportunity.upsert({
    where: { projectId_dedupeKey: { projectId: job.projectId, dedupeKey: key } },
    create: { projectId: job.projectId, dedupeKey: key, ...data },
    update: data,
  })
  // Generation evidence is replaced on each run; commercial evidence is kept.
  await db.evidenceReference.deleteMany({
    where: { opportunityId: row.id, OR: [{ relationshipId: { not: null } }, { insightId: { not: null } }, { claimId: { in: evidence.claimIds } }] },
  })
  await db.evidenceReference.createMany({
    data: [
      ...evidence.relIds.map((relationshipId) => ({ projectId: job.projectId, opportunityId: row.id, relationshipId })),
      ...evidence.insIds.map((insightId) => ({ projectId: job.projectId, opportunityId: row.id, insightId })),
      ...evidence.claimIds.map((claimId) => ({ projectId: job.projectId, opportunityId: row.id, claimId })),
    ],
  })
  return row.id
}
