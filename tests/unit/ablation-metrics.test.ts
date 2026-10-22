import { describe, expect, it } from "vitest"
import { armMetrics } from "@/server/evaluation/metrics"

const affinities = [
  { name: "Sullen Art Collective", domain: "urn:entity:brand" },
  { name: "Zumiez", domain: "urn:entity:brand" },
  { name: "Dead by Daylight", domain: "urn:entity:videogame" },
]

describe("ablation metrics", () => {
  it("counts Qloo-verified, novel and cross-domain entities per arm", () => {
    const m = armMetrics(
      [
        { opportunity: "a", entities: ["Sullen Art Collective", "sullen art collective", "Tony Hawk"] },
        { opportunity: "b", entities: ["Dead by Daylight", "Unknown Partner"] },
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
