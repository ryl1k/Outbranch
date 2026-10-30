import "server-only"
import { culturalRefListSchema, stringListSchema } from "@/lib/schemas/brand"
import { analysisConfigSchema, CATEGORY_LABELS, type AnalysisConfig } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import { untrusted } from "@/server/providers/anthropic/client"

/** Load the confirmed profile and the constraints for this discovery run. */
export async function loadDiscoveryContext(projectId: string, constraintsId: string | null) {
  const [profile, constraints] = await Promise.all([
    db.brandProfile.findUniqueOrThrow({ where: { projectId }, include: { qlooEntity: true } }),
    constraintsId ? db.analysisConstraints.findUniqueOrThrow({ where: { id: constraintsId } }) : null,
  ])
  if (profile.status !== "CONFIRMED") throw new Error("Brand profile must be confirmed before discovery")

  const config: AnalysisConfig = analysisConfigSchema.parse({
    focusCategories: constraints?.focusCategories ?? [],
    excludedCategories: constraints?.excludedCategories ?? [],
    regions: constraints?.regions ?? [],
    objectives: constraints?.objectives ?? undefined,
    budgetRange: constraints?.budgetRange ?? undefined,
    riskAppetite: (constraints?.riskAppetite as AnalysisConfig["riskAppetite"]) ?? undefined,
    notes: constraints?.notes ?? undefined,
  })
  return { profile, config, constraintsId }
}

export type DiscoveryContext = Awaited<ReturnType<typeof loadDiscoveryContext>>

/** Compact, untrusted-wrapped description of the brand used across prompts. */
export function brandBrief(ctx: DiscoveryContext) {
  const p = ctx.profile
  const refs = culturalRefListSchema
    .catch([])
    .parse(p.culturalRefs)
    .filter((r) => !r.removed)
    .map((r) => `${r.name} (${r.type}) — ${r.why}`)
  return untrusted(
    "brand_profile",
    [
      `Name: ${p.name} (${p.entityKind})`,
      `Industry: ${p.industry ?? "unknown"}`,
      `Summary: ${p.summary}`,
      p.positioning ? `Positioning: ${p.positioning}` : "",
      `Audiences: ${stringListSchema.catch([]).parse(p.audiences).join("; ") || "unknown"}`,
      `Markets: ${stringListSchema.catch([]).parse(p.markets).join("; ") || "unknown"}`,
      `Competitors: ${stringListSchema.catch([]).parse(p.competitors).join("; ") || "unknown"}`,
      refs.length ? `Confirmed cultural references:\n- ${refs.join("\n- ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  )
}

export function constraintsBrief(config: AnalysisConfig) {
  const lines = [
    config.focusCategories.length
      ? `Focus only on: ${config.focusCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}`
      : "All opportunity categories are in scope",
    config.excludedCategories.length ? `Exclude: ${config.excludedCategories.join(", ")}` : "",
    config.regions.length ? `Geographic focus: ${config.regions.join(", ")}` : "",
    config.objectives ? `Objectives: ${config.objectives}` : "",
    config.budgetRange ? `Budget: ${config.budgetRange}` : "",
    config.riskAppetite ? `Risk appetite: ${config.riskAppetite}` : "",
    config.notes ? `Notes: ${config.notes}` : "",
  ].filter(Boolean)
  return untrusted("analysis_constraints", lines.join("\n"))
}

/** Non-rejected brand-level claims, numbered S1..Sn. */
export async function claimTable(projectId: string) {
  const claims = await db.claim.findMany({
    where: { projectId, opportunityId: null, status: { not: "REJECTED" } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 40,
  })
  const aliases = new Map<string, string>()
  const lines = claims.map((c, i) => {
    aliases.set(`S${i + 1}`, c.id)
    return `S${i + 1} [${c.status}] ${c.statement}`
  })
  return { aliases, text: lines.join("\n") }
}
