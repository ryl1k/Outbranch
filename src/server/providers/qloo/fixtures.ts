/**
 * Fixture mode: deterministic, obviously synthetic data so the pipeline can run
 * without Qloo credentials. Every name is prefixed "Simulated" and every ID is
 * prefixed "fixture:" so it can never be mistaken for real Qloo research.
 */
import { ENTITY_TYPE_LABELS, type QlooEntityType } from "./types"

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function hash(s: string) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967295
}

export function fixtureResponse(endpoint: string, params: Record<string, string>): unknown {
  if (endpoint === "/search") {
    const q = params.query ?? "entity"
    const type = params.types?.split(",")[0] ?? "urn:entity:brand"
    return {
      results: [
        {
          name: `Simulated ${q}`,
          entity_id: `fixture:${slug(q)}`,
          types: [type],
          popularity: 0.5 + hash(q) / 2,
          tags: [],
        },
      ],
    }
  }
  if (endpoint === "/v2/tags") {
    const q = params["filter.query"] ?? "theme"
    return {
      results: {
        tags: [
          { id: `fixture:tag:${slug(q)}`, name: `Simulated tag: ${q}`, type: "urn:tag:fixture", popularity: 0.5 },
        ],
      },
    }
  }
  if (endpoint === "/v2/insights") {
    const type = (params["filter.type"] ?? "urn:entity:brand") as QlooEntityType
    const seed = `${type}|${params["signal.interests.entities"] ?? ""}|${params["signal.interests.tags"] ?? ""}`
    const take = Math.min(Number(params.take ?? 10), 10)
    const label = (ENTITY_TYPE_LABELS[type] ?? "Entities").replace(/s$/, "")
    return {
      success: true,
      results: {
        entities: Array.from({ length: take }, (_, i) => ({
          name: `Simulated ${label} ${String.fromCharCode(65 + i)}`,
          entity_id: `fixture:${slug(type)}:${i}:${Math.round(hash(seed) * 1e6)}`,
          subtype: type,
          popularity: Number((0.4 + hash(seed + i) * 0.5).toFixed(3)),
          tags: [],
          query: { affinity: Number((0.95 - i * 0.03).toFixed(3)) },
        })),
      },
    }
  }
  if (endpoint === "/v2/analysis/compare") return { results: { tags: [], a: [], b: [] } }
  if (endpoint === "/v2/audiences") return { results: { audiences: [] } }
  return { results: {} }
}
