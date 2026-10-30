import "server-only"
import { z } from "zod"
import { culturalRefListSchema, collaborationListSchema, stringListSchema } from "@/lib/schemas/brand"
import type { GeneratedOpportunity } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import { generateStructured, untrusted } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { loadDiscoveryContext } from "@/server/research/discovery/context"
import { draftOpportunities } from "@/server/research/discovery/opportunities"
import { armMetrics, type ArmMetrics } from "./metrics"

const extractionSchema = z.object({
  opportunities: z.array(
    z.object({
      index: z.number().int(),
      entities: z.array(z.string()).describe("Proper names of real brands, artists, works, games, places, venues or organisations"),
    }),
  ),
})

const CRITERIA = ["specificity", "evidence", "nonObviousness", "commercialClarity"] as const
const judgeSchema = z.object({
  scores: z.array(
    z.object({
      set: z.enum(["1", "2"]),
      ...Object.fromEntries(CRITERIA.map((c) => [c, z.number().int().min(1).max(5)])),
    }) as z.ZodObject<{ set: z.ZodEnum<{ "1": "1"; "2": "2" }> } & Record<(typeof CRITERIA)[number], z.ZodNumber>>,
  ),
  preferred: z.enum(["1", "2", "tie"]),
  reason: z.string(),
})

function describe(opps: GeneratedOpportunity[]) {
  return opps
    .map((o, i) => `${i + 1}. ${o.title} [${o.category}]\n   Hypothesis: ${o.hypothesis}\n   Mechanism: ${o.mechanism}\n   Partners: ${o.partners.map((p) => p.name).join(", ") || "none"}`)
    .join("\n")
}

async function extractEntities(projectId: string, opps: GeneratedOpportunity[]) {
  const out = await generateStructured({
    ctx: { projectId, operation: "ablation.extract" },
    model: MODELS.fast,
    schema: extractionSchema,
    system: "List the proper names of specific real-world entities each numbered opportunity mentions. Exclude generic categories and the brand itself.",
    prompt: untrusted("opportunities", describe(opps)),
    effort: "low",
    maxTokens: 8000,
  })
  return opps.map((o, i) => ({
    opportunity: o.title,
    entities: [...(out.opportunities.find((x) => x.index === i + 1)?.entities ?? []), ...o.partners.map((p) => p.name)],
  }))
}

export type AblationResult = {
  brand: string
  generatedAt: string
  model: string
  qlooAffinitiesAvailable: number
  arms: { qloo: ArmMetrics; llmOnly: ArmMetrics }
  judge: {
    note: string
    scores: { qloo: Record<string, number>; llmOnly: Record<string, number> }
    preferred: "qloo" | "llmOnly" | "tie"
    reason: string
  }
  detail: { qloo: { opportunity: string; entities: string[] }[]; llmOnly: { opportunity: string; entities: string[] }[] }
}

/** Qloo-enhanced vs LLM-only generation on identical inputs. */
export async function runAblation(projectId: string): Promise<AblationResult> {
  const ctx = await loadDiscoveryContext(projectId, null)
  const job = { projectId, usage: (operation: string) => ({ projectId, operation: `ablation.${operation}` }) }

  const [withQloo, withoutQloo] = await Promise.all([
    draftOpportunities(job, ctx, { includeCultural: true, includeHistory: false }),
    draftOpportunities(job, ctx, { includeCultural: false, includeHistory: false }),
  ])
  const qlooOpps = withQloo.opportunities
  const llmOpps = withoutQloo.opportunities

  const [qlooEntities, llmEntities] = await Promise.all([extractEntities(projectId, qlooOpps), extractEntities(projectId, llmOpps)])

  const relationships = await db.culturalRelationship.findMany({ where: { projectId }, include: { targetEntity: true } })
  const affinities = relationships.map((r) => ({ name: r.targetEntity.name, domain: r.domain }))
  const p = ctx.profile
  const known = [
    p.name,
    ...culturalRefListSchema.catch([]).parse(p.culturalRefs).map((r) => r.name),
    ...collaborationListSchema.catch([]).parse(p.collaborations).map((c) => c.partner),
    ...stringListSchema.catch([]).parse(p.competitors),
  ]

  // Blind pairwise judgement with randomised order.
  const qlooFirst = Math.random() < 0.5
  const judged = await generateStructured({
    ctx: { projectId, operation: "ablation.judge" },
    model: MODELS.reasoning,
    schema: judgeSchema,
    system: `You are reviewing two anonymous sets of commercial expansion ideas for the same brand.
Score each set 1-5 on: specificity (concrete, named, actionable), evidence (grounded in stated, checkable signals), nonObviousness (beyond what the brand already does), commercialClarity (clear revenue mechanism). Then state which set a strategy team should act on.`,
    prompt: [
      untrusted("brand", `${p.name}: ${p.summary}`),
      untrusted("set_1", describe(qlooFirst ? qlooOpps : llmOpps)),
      untrusted("set_2", describe(qlooFirst ? llmOpps : qlooOpps)),
    ].join("\n\n"),
    effort: "medium",
  })
  const setOf = (arm: "qloo" | "llmOnly") => ((arm === "qloo") === qlooFirst ? "1" : "2")
  const pick = (set: "1" | "2") => {
    const s = judged.scores.find((x) => x.set === set)
    return Object.fromEntries(CRITERIA.map((c) => [c, s?.[c] ?? 0]))
  }
  const preferred = judged.preferred === "tie" ? "tie" : judged.preferred === setOf("qloo") ? "qloo" : "llmOnly"

  return {
    brand: p.name,
    generatedAt: new Date().toISOString(),
    model: MODELS.reasoning,
    qlooAffinitiesAvailable: affinities.length,
    arms: {
      qloo: armMetrics(qlooEntities, affinities, known),
      llmOnly: armMetrics(llmEntities, affinities, known),
    },
    judge: {
      note: "Model judgement (blind, order randomised). Not a measured outcome.",
      scores: { qloo: pick(setOf("qloo")), llmOnly: pick(setOf("llmOnly")) },
      preferred,
      reason: judged.reason,
    },
    detail: { qloo: qlooEntities, llmOnly: llmEntities },
  }
}
