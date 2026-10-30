import { describe, expect, it } from "vitest"
import { md, renderOpportunityReport, renderProjectReport, type ReportInput, type ReportOpportunity } from "@/server/reports/markdown"

const opp: ReportOpportunity = {
  rank: 1,
  title: "Tattoo | artist cans",
  category: "COLLABORATION",
  summary: "Short summary.",
  hypothesis: "Fans of tattoo culture will buy artist cans.",
  mechanism: "DTC limited drops.",
  nextAction: "Interview three studios.",
  evidenceStrength: "LIMITED",
  partners: [{ name: "Studio X", role: "Artwork" }],
  risks: ["Low repeat purchase"],
  unknowns: ["Price sensitivity"],
  qlooEvidence: [{ entity: "Inkwell", domain: "urn:entity:brand", rank: 2 }],
  criteria: { strategicFit: { level: "high", basis: "MODEL_ASSESSED", rationale: "Fits the brand." } },
  commercial: null,
  deepDive: null,
  claims: [
    { statement: "A", status: "VERIFIED", source: { title: "Article", url: "https://a.example/1", publisher: "a.example" } },
    { statement: "B", status: "VERIFIED", source: { title: "Article", url: "https://a.example/1", publisher: "a.example" } },
    { statement: "C", status: "INFERRED", source: null },
  ],
}

const input: ReportInput = {
  brand: { name: "Brand", summary: "A brand.", industry: "Drinks", positioning: null },
  generatedAt: new Date("2026-10-22T00:00:00Z"),
  dataMode: "LIVE",
  constraints: { iteration: 2, regions: ["Japan"], focus: [], excluded: ["alcohol"] },
  insights: [{ title: "Skate culture", summary: "Strong skate affinity." }],
  opportunities: [opp],
  limitations: ["Music query failed"],
}

describe("report formatting", () => {
  it("escapes table-breaking characters", () => {
    expect(md("a | b\nc")).toBe("a \\| b c")
  })

  it("renders an opportunity brief with hypothesis labelling and deduplicated sources", () => {
    const out = renderOpportunityReport(input)
    expect(out).toContain("# Opportunity brief: Tattoo \\| artist cans")
    expect(out).toContain("_AI-generated hypothesis_")
    expect(out).toContain("| Inkwell | Brand | #2 |")
    expect(out).toContain("Studio X — Artwork")
    expect(out.match(/https:\/\/a\.example\/1/g)).toHaveLength(1)
    expect(out).toContain("_Commercial research has not been performed")
    expect(out).toContain("| Strategic fit | High | model assessment | Fits the brand. |")
  })

  it("renders a project report with scope, ranking table and limitations", () => {
    const out = renderProjectReport(input)
    expect(out).toContain("**Scope (iteration 2):** all categories; regions Japan; excluding alcohol")
    expect(out).toContain("| 1 | Tattoo \\| artist cans | Brand collaboration | Limited |")
    expect(out).toContain("### Skate culture")
    expect(out).toContain("- Music query failed")
    expect(out).not.toMatch(/\n{3,}/)
  })

  it("flags simulated data prominently", () => {
    expect(renderProjectReport({ ...input, dataMode: "FIXTURE" })).toContain("**Simulated data.**")
  })
})
