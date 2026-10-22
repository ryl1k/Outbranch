import type { GraphEdge, GraphNode } from "./graph"

const RINGS: Record<GraphNode["kind"], number> = {
  source: 0,
  reference: 230,
  cultural: 470,
  opportunity: 760,
  partner: 980,
}

type Point = { x: number; y: number }

/**
 * Deterministic radial layout: one origin, growth paths radiating outwards.
 * Cultural entities are grouped into domain sectors; opportunities sit at the
 * mean angle of the evidence they cite, so related nodes stay close.
 */
export function layoutRadial(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Point> {
  const pos = new Map<string, Point>()
  const angle = new Map<string, number>()
  const place = (id: string, r: number, a: number) => {
    angle.set(id, a)
    pos.set(id, { x: Math.round(r * Math.cos(a) * 100) / 100, y: Math.round(r * Math.sin(a) * 100) / 100 })
  }

  for (const n of nodes) if (n.kind === "source") place(n.id, 0, 0)

  const spread = (list: GraphNode[], r: number, start = -Math.PI / 2) =>
    list.forEach((n, i) => place(n.id, r, start + (2 * Math.PI * i) / Math.max(list.length, 1)))

  spread(nodes.filter((n) => n.kind === "reference"), RINGS.reference)

  // Cultural nodes: sector per domain, sorted for stable output.
  const cultural = nodes
    .filter((n) => n.kind === "cultural")
    .sort((a, b) => (a.domain ?? "").localeCompare(b.domain ?? "") || a.label.localeCompare(b.label))
  spread(cultural, RINGS.cultural, -Math.PI / 2 + 0.15)

  const incoming = new Map<string, string[]>()
  for (const e of edges) incoming.set(e.target, [...(incoming.get(e.target) ?? []), e.source])

  const meanAngle = (ids: string[]) => {
    const known = ids.map((id) => angle.get(id)).filter((a): a is number => a !== undefined)
    if (!known.length) return null
    const x = known.reduce((s, a) => s + Math.cos(a), 0)
    const y = known.reduce((s, a) => s + Math.sin(a), 0)
    return Math.atan2(y, x)
  }

  const placeNear = (list: GraphNode[], r: number, sourcesOf: (n: GraphNode) => string[]) => {
    const wanted = list.map((n, i) => ({ n, a: meanAngle(sourcesOf(n)) ?? (2 * Math.PI * i) / Math.max(list.length, 1) }))
    wanted.sort((p, q) => p.a - q.a)
    // Enforce a minimum angular gap so labels do not collide.
    const minGap = Math.min((2 * Math.PI) / Math.max(wanted.length, 1), 0.32)
    for (let i = 1; i < wanted.length; i++) {
      if (wanted[i].a - wanted[i - 1].a < minGap) wanted[i].a = wanted[i - 1].a + minGap
    }
    for (const { n, a } of wanted) place(n.id, r, a)
  }

  placeNear(nodes.filter((n) => n.kind === "opportunity"), RINGS.opportunity, (n) => incoming.get(n.id) ?? [])
  const outgoing = new Map<string, string[]>()
  for (const e of edges) outgoing.set(e.target, [...(outgoing.get(e.target) ?? []), e.source])
  placeNear(nodes.filter((n) => n.kind === "partner"), RINGS.partner, (n) => outgoing.get(n.id) ?? [])

  return pos
}
