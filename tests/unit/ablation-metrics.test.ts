import { describe, expect, it } from "vitest"
import { armMetrics } from "@/server/evaluation/metrics"

const affinities = [
  { name: "Inkwell Collective", domain: "urn:entity:brand" },
  { name: "Board Shop Co", domain: "urn:entity:brand" },
  { name: "Night Terror Game", domain: "urn:entity:videogame" },
]

describe("ablation metrics", () => {
  it("counts Qloo-verified, novel and cross-domain entities per arm", () => {
    const m = armMetrics(
      [
        { opportunity: "a", entities: ["Inkwell Collective", "inkwell collective", "Tony Hawk"] },
        { opportunity: "b", entities: ["Night Terror Game", "Unknown Partner"] },
        { opportunity: "c", entities: [] },
      ],
      affinities,
      ["Tony Hawk"],
    )
    expect(m).toEqual({
      opportunities: 3,
      namedEntities: 4,
      qlooVerifiedEntities: 2,
      qlooVerifiedRate: 0.5,
      opportunitiesWithVerifiedLink: 2,
      novelEntities: 3,
      noveltyRate: 0.75,
      verifiedDomains: 2,
    })
  })

  it("handles an arm with no named entities", () => {
    expect(armMetrics([{ opportunity: "a", entities: [] }], affinities, []).qlooVerifiedRate).toBe(0)
  })
})
