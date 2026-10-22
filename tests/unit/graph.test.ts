import { describe, expect, it } from "vitest"
import { layoutRadial } from "@/lib/graph-layout"
import { buildCulturalGraph, type GraphInput } from "@/server/graph/build"

const input: GraphInput = {
  brand: { id: "b", name: "Brand", qlooEntityId: "BRAND" },
  references: [{ qlooEntityId: "SEED", name: "Seed Artist", type: "artist" }],
  relationships: [
    { id: "r1", domain: "urn:entity:brand", rank: 1, targetEntityId: "T1", targetName: "Target One", sourceEntityId: "SEED", topScore: 0.8, retrievedAt: "2026-10-01", dataMode: "LIVE" },
    { id: "r2", domain: "urn:entity:brand", rank: 2, targetEntityId: "T2", targetName: "Target Two", sourceEntityId: null, topScore: null, retrievedAt: "2026-10-01", dataMode: "LIVE" },
    { id: "r3", domain: "urn:entity:brand", rank: 9, targetEntityId: "T3", targetName: "Deep Cut", sourceEntityId: "SEED", topScore: 0.3, retrievedAt: "2026-10-01", dataMode: "LIVE" },
    { id: "r4", domain: "urn:entity:brand", rank: 3, targetEntityId: "BRAND", targetName: "Brand", sourceEntityId: null, topScore: null, retrievedAt: "2026-10-01", dataMode: "LIVE" },
  ],
  opportunities: [
    {
      id: "o1",
      title: "Collab with Target One",
      category: "COLLABORATION",
      rank: 1,
      evidenceStrength: "LIMITED",
      relationshipIds: ["r1"],
      partners: [{ name: "Target One", qlooEntityId: "T1" }, { name: "New Retailer" }],
    },
  ],
  defaultPerDomain: 2,
}

describe("buildCulturalGraph", () => {
  const graph = buildCulturalGraph(input)
  const node = (id: string) => graph.nodes.find((n) => n.id === id)
  const edge = (id: string) => graph.edges.find((e) => e.id === id)

  it("centres the brand and never links it to itself", () => {
    expect(node("brand")?.kind).toBe("source")
    expect(graph.edges.some((e) => e.source === e.target)).toBe(false)
    expect(node("e:BRAND")).toBeUndefined()
  })

  it("attributes Qloo edges to the explainability contributor when known", () => {
    expect(edge("qloo:e:SEED->e:T1")?.kind).toBe("qloo")
    expect(edge("qloo:brand->e:T2")?.kind).toBe("qloo")
  })

  it("marks documented associations separately from Qloo affinities", () => {
    expect(edge("doc:e:SEED")?.kind).toBe("documented")
  })

  it("keeps low-ranked results collapsed until expanded", () => {
    expect(node("e:T3")?.collapsed).toBe(true)
    expect(node("e:T3")?.parentId).toBe("e:SEED")
    expect(node("e:T1")?.collapsed).toBe(false)
  })

  it("labels opportunity links and partners as hypotheses, reusing Qloo nodes for partners", () => {
    expect(edge("ev:e:T1->o:o1")?.kind).toBe("hypothesis")
    expect(edge("partner:o:o1->e:T1")?.kind).toBe("hypothesis")
    expect(node("p:new retailer")).toMatchObject({ kind: "partner", sublabel: "proposed" })
  })
})

describe("layoutRadial", () => {
  it("places the source at the centre and every visible node at a distinct position", () => {
    const graph = buildCulturalGraph(input)
    const visible = graph.nodes.filter((n) => !n.collapsed)
    const pos = layoutRadial(visible, graph.edges)
    expect(pos.get("brand")).toEqual({ x: 0, y: 0 })
    const keys = new Set([...pos.values()].map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`))
    expect(keys.size).toBe(visible.length)
  })
})
