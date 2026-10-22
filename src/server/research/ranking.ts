import type { EvidenceStrength } from "@/generated/prisma/enums"
import {
  CRITERIA,
  NEGATIVE_CRITERIA,
  type Criterion,
  type EvaluationCriteria,
  type Level,
} from "@/lib/schemas/discovery"
import { normalizeName } from "@/server/providers/qloo/normalize"

const LEVEL_VALUE: Record<Level, number> = { very_low: 0, low: 0.25, medium: 0.5, high: 0.75, very_high: 1 }

const WEIGHTS: Record<Criterion, number> = {
  culturalRelevance: 1.2,
  strategicFit: 1.2,
  businessModelClarity: 1,
  commercialPotential: 1.1,
  differentiation: 0.8,
  feasibility: 1,
  risk: 0.8,
  uncertainty: 0.6,
}

const EVIDENCE_MULTIPLIER: Record<EvidenceStrength, number> = {
  STRONG: 1,
  MODERATE: 0.92,
  LIMITED: 0.8,
  INSUFFICIENT: 0.6,
}

/**
 * Deterministic ranking from the per-criterion assessment. Criteria without
 * evidence count as "medium" but are discounted, so unsupported optimism can
 * never outrank evidence. Result is 0..100, only meaningful within a project.
 */
export function computeRankScore(criteria: EvaluationCriteria, evidence: EvidenceStrength): number {
  let total = 0
  let weightSum = 0
  for (const c of CRITERIA) {
    const a = criteria[c]
    let value = LEVEL_VALUE[a.level]
    if (NEGATIVE_CRITERIA.includes(c)) value = 1 - value
    const confidence = a.basis === "UNAVAILABLE" ? 0.5 : a.basis === "MODEL_ASSESSED" ? 0.9 : 1
    const adjusted = a.basis === "UNAVAILABLE" ? 0.5 * confidence : value * confidence
    total += adjusted * WEIGHTS[c]
    weightSum += WEIGHTS[c]
  }
  return Math.round((total / weightSum) * EVIDENCE_MULTIPLIER[evidence] * 1000) / 10
}

const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "with", "to", "in", "on", "by", "x", "into", "line", "launch", "new",
])

/** Stable key so re-runs and refinements update an opportunity instead of duplicating it. */
export function dedupeKey(category: string, title: string): string {
  const tokens = normalizeName(title)
    .split(" ")
    .filter((t) => t && !TITLE_STOPWORDS.has(t))
    .map((t) => t.replace(/s$/, ""))
  return `${category}:${[...new Set(tokens)].sort().join("-")}`
}

/** Remove near-duplicates within one generation batch, keeping the first occurrence. */
export function dedupeOpportunities<T extends { category: string; title: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((o) => {
    const key = dedupeKey(o.category, o.title)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Map model-written aliases back to ids, dropping anything the model invented. */
export function resolveAliases(aliases: string[], table: Map<string, string>): string[] {
  const out = new Set<string>()
  // Models sometimes write several aliases in one string ("R1, R4") or decorate them ("[R2]").
  for (const raw of aliases) {
    for (const match of raw.toUpperCase().matchAll(/([RSIO]d+)/g)) {
      const id = table.get(match[1])
      if (id) out.add(id)
    }
  }
  return [...out]
}
