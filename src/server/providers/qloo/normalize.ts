import type { RawEntity } from "./types"

export type NormalizedEntity = {
  qlooId: string
  name: string
  types: string[]
  subtype: string | null
  popularity: number | null
  imageUrl: string | null
  description: string | null
  disambiguation: string | null
  tags: { id: string; name: string; type: string | null }[]
}

export type NormalizedInsight = {
  entity: NormalizedEntity
  rank: number
  /** As reported by Qloo; only comparable with other results of the same query. */
  affinity: number | null
  audienceGrowth: number | null
  /** Input signals that contributed to this result, scored 0..1 by Qloo. */
  explainability: { signal: string; entityId: string; score: number }[]
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)

function imageUrl(image: unknown): string | null {
  if (typeof image === "string") return image
  if (image && typeof image === "object" && "url" in image) return str((image as { url: unknown }).url)
  return null
}

export function normalizeEntity(raw: RawEntity): NormalizedEntity {
  const props = raw.properties ?? {}
  const types = raw.types?.length ? raw.types : raw.subtype ? [raw.subtype] : []
  return {
    qlooId: raw.entity_id,
    name: raw.name,
    types,
    subtype: raw.subtype ?? types[0] ?? null,
    popularity: num(raw.popularity),
    imageUrl: imageUrl(props.image),
    description: str(props.short_description) ?? str(props.description),
    disambiguation: str(raw.disambiguation),
    tags: (raw.tags ?? []).map((t) => ({ id: t.id, name: t.name, type: t.type ?? null })),
  }
}

export function normalizeExplainability(raw: unknown): NormalizedInsight["explainability"] {
  if (!raw || typeof raw !== "object") return []
  const out: NormalizedInsight["explainability"] = []
  for (const [signal, entries] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entries)) continue
    for (const e of entries) {
      const entityId = str((e as { entity_id?: unknown }).entity_id)
      const score = num((e as { score?: unknown }).score)
      if (entityId && score !== null) out.push({ signal, entityId, score })
    }
  }
  return out
}

export function normalizeInsights(entities: RawEntity[]): NormalizedInsight[] {
  return entities.map((raw, i) => ({
    entity: normalizeEntity(raw),
    rank: i + 1,
    affinity: num(raw.query?.affinity),
    audienceGrowth: num(raw.query?.measurements?.audience_growth),
    explainability: normalizeExplainability(raw.query?.explainability),
  }))
}

/**
 * Choose the best search match for a name. Prefers an exact (case-insensitive)
 * name match, then the most popular candidate. Returns null when nothing plausibly
 * matches so callers never silently bind to an unrelated entity.
 */
export function pickBestMatch(query: string, candidates: NormalizedEntity[]): NormalizedEntity | null {
  if (!candidates.length) return null
  const q = normalizeName(query)
  const exact = candidates.filter((c) => normalizeName(c.name) === q)
  if (exact.length) return [...exact].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
  const partial = candidates.filter((c) => {
    const n = normalizeName(c.name)
    return n.includes(q) || q.includes(n)
  })
  if (partial.length) return [...partial].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
  return null
}

export function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(inc|llc|ltd|co|corp|the)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
