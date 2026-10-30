import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { commercialFindingsSchema, deepDiveSchema, partnerListSchema } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import { generateStructured, untrusted } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { ENTITY_TYPE_LABELS, type QlooEntityType } from "@/server/providers/qloo/types"
import { brandBrief, constraintsBrief, type DiscoveryContext } from "./context"

const SYSTEM = `You write the strategic deep dive for one expansion opportunity, for a business development team.
Ground every statement in the dossier. Distinguish facts (sourced claims, Qloo data) from estimates.
Never invent market sizes, prices, costs or probabilities: if a figure is not in the dossier, mark the assumption ESTIMATE or UNKNOWN and say what research would establish it.
Cultural affinity indicates shared taste, not demand or revenue. Proposed partners are proposals.
Recommended next steps must be reversible and must not commit money or contact partners without explicit approval.`

export async function writeDeepDive(job: JobContext, ctx: DiscoveryContext, opportunityId: string) {
  await job.stage("deep-dive", "Writing the strategic deep dive")
  const opp = await db.opportunity.findUniqueOrThrow({
    where: { id: opportunityId },
    include: {
      claims: { include: { source: true } },
      evidence: { include: { relationship: { include: { targetEntity: true, sourceEntity: true } }, insight: true } },
    },
  })
  const commercial = commercialFindingsSchema.omit({ claims: true }).partial().safeParse(opp.commercial ?? {})
  const partners = partnerListSchema.catch([]).parse(opp.partners)
  const rels = opp.evidence.flatMap((e) => (e.relationship ? [e.relationship] : []))
  const insights = opp.evidence.flatMap((e) => (e.insight ? [e.insight] : []))

  const dossier = [
    `Opportunity: ${opp.title} [${opp.category}]`,
    `Hypothesis: ${opp.hypothesis}`,
    `Mechanism: ${opp.mechanism}`,
    `Proposed partners: ${partners.map((p) => `${p.name} (${p.role})`).join("; ") || "none"}`,
    `Qloo relationships:\n${rels.map((r) => `- ${ENTITY_TYPE_LABELS[r.domain as QlooEntityType] ?? r.domain}: ${r.targetEntity.name} (rank ${r.rank} in its query${r.sourceEntity ? `, driven by ${r.sourceEntity.name}` : ""})`).join("\n") || "none"}`,
    `Cultural insights:\n${insights.map((i) => `- ${i.title}: ${i.summary}`).join("\n") || "none"}`,
    commercial.success ? `Commercial findings: ${JSON.stringify(commercial.data)}` : "Commercial findings: none",
    `Sourced claims:\n${opp.claims.map((c) => `- [${c.status}] ${c.statement}${c.source?.publisher ? ` (${c.source.publisher})` : ""}`).join("\n") || "none"}`,
    `Known risks: ${(opp.risks as string[]).join("; ")}`,
    `Unknowns: ${(opp.unknowns as string[]).join("; ")}`,
  ].join("\n\n")

  const deepDive = await generateStructured({
    ctx: job.usage("deep-dive.write"),
    model: MODELS.reasoning,
    schema: deepDiveSchema,
    system: SYSTEM,
    prompt: [brandBrief(ctx), constraintsBrief(ctx.config), untrusted("opportunity_dossier", dossier)].join("\n\n"),
    effort: "high",
  })
  await db.opportunity.update({
    where: { id: opportunityId },
    data: { deepDive: deepDive as Prisma.InputJsonValue, deepDiveAt: new Date() },
  })
}
