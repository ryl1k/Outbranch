import { describe, expect, it } from "vitest"
import { encodeParams } from "@/server/providers/qloo/client"
import { fixtureResponse } from "@/server/providers/qloo/fixtures"
import {
  normalizeEntity,
  normalizeExplainability,
  normalizeInsights,
  normalizeName,
  pickBestMatch,
} from "@/server/providers/qloo/normalize"
import { insightsResponseSchema, searchResponseSchema } from "@/server/providers/qloo/types"

// Hand-written shapes mirroring the documented response structure (no real Qloo data).
const rawEntity = {
  name: "Example Brand",
  entity_id: "AAAA-1111",
  types: ["urn:entity:brand"],
  popularity: 0.91,
  properties: { short_description: "  An example.  ", image: { url: "https://img.example/x.png" } },
  tags: [{ id: "urn:tag:genre:brand:fashion", name: "Fashion", type: "urn:tag:genre:brand" }],
  query: {
    affinity: 0.82,
    measurements: { audience_growth: 0.03 },
    explainability: { "signal.interests.entities": [{ entity_id: "SRC-1", score: 0.7 }] },
  },
}

describe("normalizeEntity", () => {
  it("extracts the fields Outbranch stores", () => {
    const e = normalizeEntity(rawEntity)
    expect(e).toMatchObject({
      qlooId: "AAAA-1111",
      name: "Example Brand",
      types: ["urn:entity:brand"],
      subtype: "urn:entity:brand",
      popularity: 0.91,
      imageUrl: "https://img.example/x.png",
      description: "An example.",
    })
    expect(e.tags).toEqual([{ id: "urn:tag:genre:brand:fashion", name: "Fashion", type: "urn:tag:genre:brand" }])
  })

  it("accepts search-style tags that use tag_id instead of id", () => {
    const parsed = searchResponseSchema.parse({
      results: [{ name: "Show", entity_id: "S1", tags: [{ tag_id: "urn:tag:keyword:media:x", name: "x" }] }],
    })
    expect(normalizeEntity(parsed.results[0]).tags[0].id).toBe("urn:tag:keyword:media:x")
  })

  it("skips malformed tags instead of rejecting the entity", () => {
    const parsed = insightsResponseSchema.parse({
      results: { entities: [{ name: "Artist", entity_id: "A1", tags: [{ type: "urn:tag:voice_type:qloo" }, { id: "t1", name: "Rock" }] }] },
    })
    expect(normalizeEntity(parsed.results.entities[0]).tags.map((x) => x.id)).toEqual(["t1"])
  })

  it("falls back to subtype when types is absent and tolerates missing properties", () => {
    const e = normalizeEntity({ name: "X", entity_id: "1", subtype: "urn:entity:artist" })
    expect(e.types).toEqual(["urn:entity:artist"])
    expect(e.description).toBeNull()
    expect(e.imageUrl).toBeNull()
    expect(e.popularity).toBeNull()
  })
})

describe("normalizeInsights", () => {
  it("keeps rank order, affinity, audience growth and explainability", () => {
    const [first, second] = normalizeInsights([rawEntity, { name: "Y", entity_id: "2" }])
    expect(first.rank).toBe(1)
    expect(first.affinity).toBe(0.82)
    expect(first.audienceGrowth).toBe(0.03)
    expect(first.explainability).toEqual([{ signal: "signal.interests.entities", entityId: "SRC-1", score: 0.7 }])
    expect(second.rank).toBe(2)
    expect(second.affinity).toBeNull()
    expect(second.explainability).toEqual([])
  })

  it("ignores malformed explainability entries", () => {
    expect(normalizeExplainability({ a: [{ entity_id: 3, score: "x" }], b: "nope" })).toEqual([])
    expect(normalizeExplainability(null)).toEqual([])
  })
})

describe("pickBestMatch", () => {
  const candidates = [
    normalizeEntity({ name: "Nike SB", entity_id: "a", popularity: 0.7 }),
    normalizeEntity({ name: "Nike", entity_id: "b", popularity: 0.99 }),
    normalizeEntity({ name: "Nike, Inc.", entity_id: "c", popularity: 0.5 }),
  ]

  it("prefers an exact normalized name match", () => {
    expect(pickBestMatch("nike", candidates)?.qlooId).toBe("b")
  })

  it("returns null rather than binding to an unrelated entity", () => {
    expect(pickBestMatch("Patagonia", candidates)).toBeNull()
    expect(pickBestMatch("Nike", [])).toBeNull()
  })

  it("normalizes corporate suffixes and punctuation", () => {
    expect(normalizeName("Nike, Inc.")).toBe("nike")
    expect(normalizeName("Pokémon")).toBe("pokemon")
  })
})

describe("encodeParams", () => {
  it("joins arrays, drops empty values and sorts keys deterministically", () => {
    expect(
      encodeParams({
        take: 5,
        "signal.interests.entities": ["A", "B"],
        "filter.type": "urn:entity:brand",
        "filter.tags": [],
        "feature.explainability": true,
        missing: undefined,
      }),
    ).toEqual({
      "feature.explainability": "true",
      "filter.type": "urn:entity:brand",
      "signal.interests.entities": "A,B",
      take: "5",
    })
  })
})

describe("fixture mode", () => {
  it("returns schema-valid data that is clearly labeled as simulated", () => {
    const body = fixtureResponse("/v2/insights", { "filter.type": "urn:entity:artist", take: "3" })
    const parsed = insightsResponseSchema.parse(body)
    expect(parsed.results.entities).toHaveLength(3)
    for (const e of parsed.results.entities) {
      expect(e.name.startsWith("Simulated")).toBe(true)
      expect(e.entity_id.startsWith("fixture:")).toBe(true)
    }
  })
})
