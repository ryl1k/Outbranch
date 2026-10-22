"use client"

import "@xyflow/react/dist/style.css"
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useInternalNode,
  BaseEdge,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { ArrowRight, Expand, List, Maximize2, Share2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  EDGE_KIND_LABELS,
  NODE_KIND_LABELS,
  type CulturalGraph,
  type EdgeKind,
  type GraphEdge,
  type GraphNode,
  type NodeKind,
} from "@/lib/graph"
import { layoutRadial } from "@/lib/graph-layout"
import { cn } from "@/lib/utils"

const DOMAIN_LABELS: Record<string, string> = {
  "urn:entity:brand": "Brands",
  "urn:entity:artist": "Artists",
  "urn:entity:movie": "Movies",
  "urn:entity:tv_show": "TV shows",
  "urn:entity:videogame": "Games",
  "urn:entity:book": "Books",
  "urn:entity:podcast": "Podcasts",
  "urn:entity:person": "People",
  "urn:entity:place": "Places",
  "urn:entity:destination": "Destinations",
}

const EDGE_STYLE: Record<EdgeKind, React.CSSProperties> = {
  qloo: { stroke: "var(--edge-qloo)", strokeWidth: 1.6 },
  documented: { stroke: "var(--edge-verified)", strokeWidth: 1.6 },
  hypothesis: { stroke: "var(--edge-hypothesis)", strokeWidth: 1.4, strokeDasharray: "5 4" },
}

type FlowData = GraphNode & { dimmed: boolean; selected: boolean; expandable: boolean }

// Edges are drawn centre-to-centre by BranchEdge, so handles only need to exist.
const centred = "opacity-0! top-1/2! left-1/2! -translate-1/2!"
const hidden = <Handle type="target" position={Position.Top} className={centred} />
const hiddenSource = <Handle type="source" position={Position.Bottom} className={centred} />

/** Gentle quadratic curve between node centres: the "branching path" motif. */
function BranchEdge({ id, source, target, style }: EdgeProps) {
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  if (!s || !t) return null
  const sx = s.internals.positionAbsolute.x + (s.measured.width ?? 0) / 2
  const sy = s.internals.positionAbsolute.y + (s.measured.height ?? 0) / 2
  const tx = t.internals.positionAbsolute.x + (t.measured.width ?? 0) / 2
  const ty = t.internals.positionAbsolute.y + (t.measured.height ?? 0) / 2
  const mx = (sx + tx) / 2
  const my = (sy + ty) / 2
  const bend = 0.12
  const cx = mx - (ty - sy) * bend
  const cy = my + (tx - sx) * bend
  return <BaseEdge id={id} path={`M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`} style={style} />
}

const edgeTypes = { branch: BranchEdge }

function SourceNode({ data }: NodeProps<Node<FlowData>>) {
  return (
    <div className={cn("grid size-28 place-items-center rounded-full bg-primary p-3 text-center text-primary-foreground shadow-[0_0_0_10px_rgb(107_17_46/0.12),0_0_0_22px_rgb(107_17_46/0.06)] transition-opacity", data.dimmed && "opacity-40")}>
      {hidden}
      <span className="text-sm leading-tight font-semibold">{data.label}</span>
      {hiddenSource}
    </div>
  )
}

function ReferenceNode({ data }: NodeProps<Node<FlowData>>) {
  return (
    <div className={cn("max-w-40 rounded-full border-2 border-sage-strong/50 bg-sage-soft px-3 py-1.5 text-center text-xs font-medium text-sage-strong transition-opacity", data.selected && "ring-2 ring-primary", data.dimmed && "opacity-30")}>
      {hidden}
      {data.label}
      {data.expandable && <span className="ml-1 font-mono text-[10px] opacity-70">+</span>}
      {hiddenSource}
    </div>
  )
}

function CulturalNode({ data }: NodeProps<Node<FlowData>>) {
  return (
    <div className={cn("flex max-w-44 items-center gap-1.5 rounded-full border bg-card py-1 pr-2.5 pl-1 text-xs shadow-sm transition-opacity", data.selected && "ring-2 ring-primary", data.dimmed && "opacity-25")}>
      {hidden}
      <span className="size-3 shrink-0 rounded-full bg-graph-cultural" />
      <span className="truncate">{data.label}</span>
      {data.expandable && <span className="font-mono text-[10px] text-muted-foreground">+</span>}
      {hiddenSource}
    </div>
  )
}

function OpportunityNode({ data }: NodeProps<Node<FlowData>>) {
  return (
    <div className={cn("w-52 rounded-xl border-2 border-graph-opportunity/80 bg-aubergine p-2.5 text-ivory shadow-md transition-opacity", data.selected && "ring-4 ring-rose/50", data.dimmed && "opacity-30")}>
      {hidden}
      <div className="flex items-start gap-2">
        {data.rank ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose font-mono text-[10px] text-aubergine">{data.rank}</span> : null}
        <span className="line-clamp-3 text-xs leading-snug font-medium">{data.label}</span>
      </div>
      <p className="mt-1 text-[10px] tracking-wide text-rose/80 uppercase">AI hypothesis</p>
      {hiddenSource}
    </div>
  )
}

function PartnerNode({ data }: NodeProps<Node<FlowData>>) {
  return (
    <div className={cn("max-w-40 rounded-md border border-dashed border-graph-partner bg-card px-2.5 py-1 text-xs text-graph-partner transition-opacity", data.selected && "ring-2 ring-primary", data.dimmed && "opacity-25")}>
      {hidden}
      {data.label} <span className="text-[10px] opacity-70">· proposed</span>
      {hiddenSource}
    </div>
  )
}

const nodeTypes = { source: SourceNode, reference: ReferenceNode, cultural: CulturalNode, opportunity: OpportunityNode, partner: PartnerNode }

function Inspector({
  graph,
  node,
  projectId,
  onExpand,
  canExpand,
  onClose,
}: {
  graph: CulturalGraph
  node: GraphNode
  projectId: string
  onExpand: () => void
  canExpand: boolean
  onClose: () => void
}) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const connected = graph.edges.filter((e) => e.source === node.id || e.target === node.id)
  return (
    <aside className="absolute top-3 right-3 bottom-3 z-10 flex w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <p className="eyebrow">{NODE_KIND_LABELS[node.kind]}</p>
          <h3 className="mt-1 font-semibold">{node.label}</h3>
          {node.domain && <p className="text-xs text-muted-foreground">{DOMAIN_LABELS[node.domain] ?? node.domain}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close inspector">
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {node.kind === "partner" && (
          <p className="rounded-lg bg-warning-soft p-2.5 text-xs text-warning">A proposed partner. Outbranch has not verified any existing relationship.</p>
        )}
        <p className="text-xs font-medium text-muted-foreground">{connected.length} relationships</p>
        <ul className="space-y-2">
          {connected.map((e) => {
            const other = byId.get(e.source === node.id ? e.target : e.source)
            return (
              <li key={e.id} className="rounded-lg border p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{other?.label}</span>
                  <Badge variant={e.kind === "qloo" ? "rose" : e.kind === "documented" ? "sage" : "accent"} className="text-[10px]">
                    {e.kind === "qloo" ? "Qloo" : e.kind === "documented" ? "Documented" : "Hypothesis"}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{EDGE_KIND_LABELS[e.kind]}</p>
                {e.kind === "qloo" && (
                  <dl className="mt-1.5 grid grid-cols-2 gap-1 font-mono text-[10px] text-muted-foreground">
                    {e.detail.affinityRank !== undefined && <><dt>Rank in query</dt><dd>#{e.detail.affinityRank}</dd></>}
                    {e.detail.explainabilityScore !== undefined && <><dt>Explainability</dt><dd>{e.detail.explainabilityScore.toFixed(2)}</dd></>}
                    {e.detail.retrievedAt && <><dt>Retrieved</dt><dd>{e.detail.retrievedAt.slice(0, 10)}</dd></>}
                    {e.detail.dataMode && <><dt>Data</dt><dd>{e.detail.dataMode === "LIVE" ? "Live" : "Simulated"}</dd></>}
                  </dl>
                )}
                {e.detail.note && <p className="mt-1 text-muted-foreground">{e.detail.note}</p>}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="space-y-2 border-t p-3">
        {canExpand && (
          <Button variant="outline" size="sm" className="w-full" onClick={onExpand}>
            <Expand /> Expand related Qloo results
          </Button>
        )}
        {node.opportunityId && (
          <Button asChild size="sm" className="w-full">
            <Link href={`/projects/${projectId}/opportunities/${node.opportunityId}`}>
              Open opportunity <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </aside>
  )
}

function Explorer({ graph, projectId }: { graph: CulturalGraph; projectId: string }) {
  const { fitView } = useReactFlow()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [kinds, setKinds] = useState<NodeKind[]>(["reference", "cultural", "opportunity", "partner"])
  const domains = useMemo(() => [...new Set(graph.nodes.flatMap((n) => (n.domain ? [n.domain] : [])))], [graph])
  const [activeDomains, setActiveDomains] = useState<string[]>(domains)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const visible = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (n.kind === "source") return true
      if (!kinds.includes(n.kind)) return false
      if (n.kind === "cultural" && n.domain && !activeDomains.includes(n.domain)) return false
      if (n.collapsed && !(n.parentId && expanded.has(n.parentId))) return false
      return true
    })
  }, [graph, kinds, activeDomains, expanded])

  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible])
  const visibleEdges = useMemo(
    () => graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [graph, visibleIds],
  )
  const positions = useMemo(() => layoutRadial(visible, visibleEdges), [visible, visibleEdges])

  // Path highlight: the selected node, its neighbours, and for opportunities the full evidence chain back to the brand.
  const highlighted = useMemo(() => {
    if (!selectedId) return null
    const ids = new Set([selectedId])
    const queue = [selectedId]
    const upstream = graph.nodes.find((n) => n.id === selectedId)?.kind === "opportunity"
    while (queue.length) {
      const id = queue.shift()!
      for (const e of visibleEdges) {
        const next = e.source === id ? e.target : e.target === id ? e.source : null
        if (!next || ids.has(next)) continue
        if (!upstream && id !== selectedId) continue
        ids.add(next)
        if (upstream && e.target === id) queue.push(next)
      }
    }
    return ids
  }, [selectedId, visibleEdges, graph.nodes])

  const childCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of graph.nodes) if (n.collapsed && n.parentId) m.set(n.parentId, (m.get(n.parentId) ?? 0) + 1)
    return m
  }, [graph])

  const flowNodes: Node<FlowData>[] = visible.map((n) => {
    const p = positions.get(n.id) ?? { x: 0, y: 0 }
    return {
      id: n.id,
      type: n.kind,
      position: { x: p.x, y: p.y },
      origin: [0.5, 0.5],
      data: {
        ...n,
        selected: n.id === selectedId,
        dimmed: Boolean(highlighted && !highlighted.has(n.id)),
        expandable: (childCount.get(n.id) ?? 0) > 0 && !expanded.has(n.id),
      },
    }
  })
  const flowEdges: Edge[] = visibleEdges.map((e) => {
    const on = highlighted ? highlighted.has(e.source) && highlighted.has(e.target) : false
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "branch",
      animated: on,
      style: { ...EDGE_STYLE[e.kind], opacity: highlighted ? (on ? 1 : 0.08) : 0.55, strokeWidth: on ? 2.4 : EDGE_STYLE[e.kind].strokeWidth },
    }
  })

  const reset = useCallback(() => {
    setSelectedId(null)
    setExpanded(new Set())
    setKinds(["reference", "cultural", "opportunity", "partner"])
    setActiveDomains(domains)
    requestAnimationFrame(() => fitView({ duration: 400, padding: 0.12 }))
  }, [domains, fitView])

  const initialized = useNodesInitialized()
  useEffect(() => {
    if (initialized) requestAnimationFrame(() => fitView({ duration: 300, padding: 0.08 }))
  }, [initialized, visible.length, fitView])

  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <ToggleGroup type="multiple" value={kinds} onValueChange={(v) => setKinds(v as NodeKind[])} variant="outline" size="sm" className="flex-wrap justify-start" aria-label="Node types">
          {(["reference", "cultural", "opportunity", "partner"] as const).map((k) => (
            <ToggleGroupItem key={k} value={k} className="px-3 text-xs">
              {NODE_KIND_LABELS[k]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Domains">
          {domains.map((d) => {
            const on = activeDomains.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setActiveDomains((s) => (on ? s.filter((x) => x !== d) : [...s, d]))}
                className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-rose-strong/40 bg-rose-soft text-rose-strong" : "text-muted-foreground")}
              >
                {DOMAIN_LABELS[d] ?? d}
              </button>
            )
          })}
          <Button variant="ghost" size="sm" onClick={reset}>
            <Maximize2 /> Reset view
          </Button>
        </div>
      </div>

      <div className="relative h-[70dvh] min-h-[520px] overflow-hidden rounded-xl border bg-card">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, n) => setSelectedId(n.id === selectedId ? null : n.id)}
          onPaneClick={() => setSelectedId(null)}
          nodesConnectable={false}
          nodesDraggable
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--border-strong)" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" style={{ width: 160, height: 110 }} className="hidden! md:block!" nodeColor={(n) => (n.type === "opportunity" ? "#1A0E14" : n.type === "source" ? "#6B112E" : n.type === "reference" ? "#5d7459" : "#b46a7c")} />
        </ReactFlow>

        <div className="pointer-events-none absolute right-3 bottom-3 space-y-1 rounded-lg border bg-card/90 p-2.5 text-[11px] backdrop-blur md:right-auto md:bottom-auto md:top-3 md:left-3">
          {(Object.keys(EDGE_STYLE) as EdgeKind[]).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <svg width="26" height="6" aria-hidden>
                <line x1="0" y1="3" x2="26" y2="3" style={EDGE_STYLE[k]} />
              </svg>
              {EDGE_KIND_LABELS[k]}
            </div>
          ))}
        </div>

        {selected && (
          <Inspector
            graph={graph}
            node={selected}
            projectId={projectId}
            canExpand={(childCount.get(selected.id) ?? 0) > 0 && !expanded.has(selected.id)}
            onExpand={() => setExpanded((s) => new Set([...s, selected.id]))}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}

function RelationshipList({ graph, projectId }: { graph: CulturalGraph; projectId: string }) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const groups: { kind: EdgeKind; edges: GraphEdge[] }[] = (["hypothesis", "qloo", "documented"] as const).map((kind) => ({
    kind,
    edges: graph.edges.filter((e) => e.kind === kind),
  }))
  return (
    <div className="space-y-6">
      {groups.map(({ kind, edges }) => (
        <section key={kind} className="space-y-2">
          <h3 className="text-sm font-semibold">
            {EDGE_KIND_LABELS[kind]} <span className="font-mono text-xs text-muted-foreground">{edges.length}</span>
          </h3>
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {edges.slice(0, 150).map((e) => {
              const s = byId.get(e.source)
              const t = byId.get(e.target)
              const opp = t?.opportunityId ? t : s?.opportunityId ? s : null
              return (
                <li key={e.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="font-medium">{s?.label}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="font-medium">{t?.label}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {e.detail.affinityRank !== undefined && <span className="font-mono">rank #{e.detail.affinityRank}</span>}
                    {e.detail.domain && <span>{DOMAIN_LABELS[e.detail.domain]}</span>}
                    {opp?.opportunityId && (
                      <Link className="text-primary hover:underline" href={`/projects/${projectId}/opportunities/${opp.opportunityId}`}>
                        Open
                      </Link>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

const MOBILE = "(max-width: 767px)"
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

export function NetworkExplorer({ graph, projectId }: { graph: CulturalGraph; projectId: string }) {
  // Large graphs are impractical on small screens: default to the list there.
  const isMobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE).matches, () => false)
  const [choice, setView] = useState<"graph" | "list" | null>(null)
  const view = choice ?? (isMobile ? "list" : "graph")
  return (
    <div className="space-y-4">
      <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "graph" | "list")} variant="outline" size="sm" aria-label="View">
        <ToggleGroupItem value="graph" className="px-3">
          <Share2 /> Network
        </ToggleGroupItem>
        <ToggleGroupItem value="list" className="px-3">
          <List /> List
        </ToggleGroupItem>
      </ToggleGroup>
      {view === "graph" ? (
        <ReactFlowProvider>
          <Explorer graph={graph} projectId={projectId} />
        </ReactFlowProvider>
      ) : (
        <RelationshipList graph={graph} projectId={projectId} />
      )}
    </div>
  )
}
