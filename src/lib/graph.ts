/**
 * Cultural network model. Every edge carries its provenance so the UI never
 * presents a proposed partnership as an existing relationship.
 */
export type NodeKind = "source" | "reference" | "cultural" | "opportunity" | "partner"

/**
 * documented — a public-research association (cited in the confirmed brand profile)
 * qloo       — a Qloo-reported taste affinity
 * hypothesis — an AI-proposed link (evidence → opportunity, opportunity → proposed partner)
 */
export type EdgeKind = "documented" | "qloo" | "hypothesis"

export type GraphNode = {
  id: string
  kind: NodeKind
  label: string
  sublabel?: string
  domain?: string
  opportunityId?: string
  category?: string
  rank?: number | null
  evidenceStrength?: string
  /** Hidden until the user expands its parent. */
  collapsed?: boolean
  /** Parent node for expansion (cultural results attributed to a seed). */
  parentId?: string
  imageUrl?: string | null
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  kind: EdgeKind
  detail: {
    affinityRank?: number
    domain?: string
    explainabilityScore?: number
    retrievedAt?: string
    dataMode?: string
    note?: string
  }
}

export type CulturalGraph = { nodes: GraphNode[]; edges: GraphEdge[] }

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  source: "Brand",
  reference: "Documented association",
  cultural: "Qloo cultural entity",
  opportunity: "Opportunity (AI hypothesis)",
  partner: "Proposed partner",
}

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = {
  documented: "Documented in public research",
  qloo: "Qloo taste affinity",
  hypothesis: "AI-proposed link",
}
