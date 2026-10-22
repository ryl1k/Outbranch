import { describe, expect, it } from "vitest"
import { CRITERIA, type CriterionAssessment, type EvaluationCriteria, type Level } from "@/lib/schemas/discovery"
import { computeRankScore, dedupeKey, dedupeOpportunities, resolveAliases } from "@/server/research/ranking"

function criteria(level: Level, basis: CriterionAssessment["basis"] = "MODEL_ASSESSED", overrides = {}) {
  const base = Object.fromEntries(CRITERIA.map((c) => [c, { level, rationale: "", basis }])) as EvaluationCriteria
  return { ...base, ...overrides } as EvaluationCriteria
}

describe("computeRankScore", () => {
  it("is bounded 0..100 and monotonic in positive criteria", () => {
    const low = computeRankScore(criteria("low", "MEASURED", { risk: { level: "medium", rationale: "", basis: "MEASURED" }, uncertainty: { level: "medium", rationale: "", basis: "MEASURED" } }), "STRONG")
    const high = computeRankScore(criteria("high", "MEASURED", { risk: { level: "medium", rationale: "", basis: "MEASURED" }, uncertainty: { level: "medium", rationale: "", basis: "MEASURED" } }), "STRONG")
    expect(high).toBeGreaterThan(low)
    expect(high).toBeLessThanOrEqual(100)
    expect(low).toBeGreaterThanOrEqual(0)
  })

  it("treats risk and uncertainty as negative", () => {
    const safe = criteria("high", "MODEL_ASSESSED", { risk: { level: "very_low", rationale: "", basis: "MODEL_ASSESSED" } })
    const risky = criteria("high", "MODEL_ASSESSED", { risk: { level: "very_high", rationale: "", basis: "MODEL_ASSESSED" } })
    expect(computeRankScore(safe, "MODERATE")).toBeGreaterThan(computeRankScore(risky, "MODERATE"))
  })

  it("never lets unsupported optimism outrank the same claims with evidence", () => {
    const unsupported = criteria("very_high", "UNAVAILABLE")
    const supported = criteria("high", "MEASURED", {
      risk: { level: "low", rationale: "", basis: "MEASURED" },
      uncertainty: { level: "low", rationale: "", basis: "MEASURED" },
    })
    expect(computeRankScore(supported, "STRONG")).toBeGreaterThan(computeRankScore(unsupported, "STRONG"))
  })

  it("discounts weaker evidence", () => {
    const c = criteria("high")
    expect(computeRankScore(c, "STRONG")).toBeGreaterThan(computeRankScore(c, "LIMITED"))
    expect(computeRankScore(c, "LIMITED")).toBeGreaterThan(computeRankScore(c, "INSUFFICIENT"))
  })
})

describe("dedupeKey", () => {
  it("ignores case, punctuation, plurals and filler words", () => {
    expect(dedupeKey("COLLABORATION", "Liquid Death x Metallica Tour Merch")).toBe(
      dedupeKey("COLLABORATION", "Tour merch with Metallica — Liquid Death"),
    )
    expect(dedupeKey("LICENSING", "Horror Film Licensing")).toBe(dedupeKey("LICENSING", "horror films licensing"))
  })

  it("keeps different categories apart", () => {
    expect(dedupeKey("LICENSING", "Skate apparel")).not.toBe(dedupeKey("PRODUCT_CATEGORY", "Skate apparel"))
  })

  it("dedupes a batch keeping the first occurrence", () => {
    const out = dedupeOpportunities([
      { category: "PARTNERSHIP", title: "Partner with skate parks", id: 1 },
      { category: "PARTNERSHIP", title: "Skate park partner", id: 2 },
      { category: "PARTNERSHIP", title: "Festival bars", id: 3 },
    ])
    expect(out.map((o) => o.id)).toEqual([1, 3])
  })
})

describe("resolveAliases", () => {
  it("maps known aliases and drops invented ones", () => {
    const table = new Map([
      ["R1", "rel_a"],
      ["R2", "rel_b"],
    ])
    expect(resolveAliases(["r1", "R2", "R9", "R1"], table)).toEqual(["rel_a", "rel_b"])
  })

  it("extracts several aliases from one decorated string", () => {
    const table = new Map([
      ["R1", "a"],
      ["R4", "b"],
      ["R12", "c"],
    ])
    expect(resolveAliases(["R1, R4", "[R12]", "see R41"], table)).toEqual(["a", "b", "c"])
  })
})
