import type { CulturalGraph, GraphEdge, GraphNode } from "@/lib/graph"

export type GraphInput = {
  brand: { id: string; name: string; qlooEntityId: string | null; imageUrl?: string | null }
  references: { qlooEntityId: string; name: string; type: string }[]
  relationships: {
    id: string
    domain: string
    rank: number
    targetEntityId: string
    targetName: string
    targetImage?: string | null
    sourceEntityId: string | null
    topScore: number | null
    retrievedAt: string
    dataMode: string
  }[]
  opportunities: {
    id: string
    title: string
    category: string
    rank: number | null
    evidenceStrength: string
    relationshipIds: string[]
    partners: { name: string; qlooEntityId?: string | null }[]
  }[]
  /** Results per domain shown before the user expands a node. */
  defaultPerDomain?: number
}

/**
 * Build the cultural network from persisted research. Nodes are deduplicated by
 * their underlying entity; edges keep the kind of evidence that created them.
 */
export function buildCulturalGraph(input: GraphInput): CulturalGraph {
  const nodes = new Map<string, GraphNode>()
  const edges = new Map<string, GraphEdge>()
  const perDomain = input.defaultPerDomain ?? 3
  const brandNodeId = "brand"
  const entityNode = (qlooEntityId: string) => (qlooEntityId === input.brand.qlooEntityId ? brandNodeId : `e:${qlooEntityId}`)

  nodes.set(brandNodeId, { id: brandNodeId, kind: "source", label: input.brand.name, imageUrl: input.brand.imageUrl })

  for (const ref of input.references) {
    const id = entityNode(ref.qlooEntityId)
    if (id === brandNodeId) continue
    nodes.set(id, { id, kind: "reference", label: ref.name, sublabel: ref.type.replace("_", " ") })
    edges.set(`doc:${id}`, {
      id: `doc:${id}`,
      source: brandNodeId,
      target: id,
      kind: "documented",
      detail: { note: "Association documented in the confirmed brand profile" },
    })
  }

  const linked = new Set(input.opportunities.flatMap((o) => o.relationshipIds))
  const shownPerDomain = new Map<string, number>()
  const sorted = [...input.relationships].sort((a, b) => a.rank - b.rank)

  for (const rel of sorted) {
    const id = entityNode(rel.targetEntityId)
    if (id === brandNodeId) continue
    const parent = rel.sourceEntityId ? entityNode(rel.sourceEntityId) : brandNodeId
    const parentId = nodes.has(parent) ? parent : brandNodeId
    const count = shownPerDomain.get(rel.domain) ?? 0
    const visibleByDefault = linked.has(rel.id) || count < perDomain
    if (visibleByDefault) shownPerDomain.set(rel.domain, count + 1)

    const existing = nodes.get(id)
    if (!existing) {
      nodes.set(id, {
        id,
        kind: "cultural",
        label: rel.targetName,
        domain: rel.domain,
        collapsed: !visibleByDefault,
        parentId,
        imageUrl: rel.targetImage,
      })
    } else if (existing.kind === "cultural" && visibleByDefault) {
      existing.collapsed = false
    }

    const edgeId = `qloo:${parentId}->${id}`
    if (!edges.has(edgeId)) {
      edges.set(edgeId, {
        id: edgeId,
        source: parentId,
        target: id,
        kind: "qloo",
        detail: {
          affinityRank: rel.rank,
          domain: rel.domain,
          explainabilityScore: rel.topScore ?? undefined,
          retrievedAt: rel.retrievedAt,
          dataMode: rel.dataMode,
        },
      })
    }
  }

  const relTarget = new Map(input.relationships.map((r) => [r.id, entityNode(r.targetEntityId)]))
  for (const opp of input.opportunities) {
    const oppId = `o:${opp.id}`
    nodes.set(oppId, {
      id: oppId,
      kind: "opportunity",
      label: opp.title,
      opportunityId: opp.id,
      category: opp.category,
      rank: opp.rank,
      evidenceStrength: opp.evidenceStrength,
    })
    for (const relId of opp.relationshipIds) {
      const target = relTarget.get(relId)
      if (!target || !nodes.has(target)) continue
      const node = nodes.get(target)!
      node.collapsed = false
      edges.set(`ev:${target}->${oppId}`, {
        id: `ev:${target}->${oppId}`,
        source: target,
        target: oppId,
        kind: "hypothesis",
        detail: { note: "Cited as cultural evidence for this hypothesis" },
      })
    }
    for (const partner of opp.partners) {
      const existing = partner.qlooEntityId ? entityNode(partner.qlooEntityId) : null
      const pid = existing && nodes.has(existing) ? existing : `p:${partner.name.toLowerCase()}`
      if (!nodes.has(pid)) nodes.set(pid, { id: pid, kind: "partner", label: partner.name, sublabel: "proposed" })
      if (pid === brandNodeId) continue
      edges.set(`partner:${oppId}->${pid}`, {
        id: `partner:${oppId}->${pid}`,
        source: oppId,
        target: pid,
        kind: "hypothesis",
        detail: { note: "Proposed partner — not an existing relationship" },
      })
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}
