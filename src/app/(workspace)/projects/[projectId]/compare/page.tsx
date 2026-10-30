import Link from "next/link"
import { GitCompareArrows, Info } from "lucide-react"
import { CategoryBadge, EvidenceStrengthBadge, LevelMeter } from "@/components/opportunities/badges"
import { CompareSelector } from "@/components/opportunities/compare-selector"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/workspace/primitives"
import {
  commercialFindingsSchema,
  evaluationCriteriaSchema,
  type Criterion,
  type OpportunityCategory,
} from "@/lib/schemas/discovery"
import { cn } from "@/lib/utils"
import { assertProjectReadAccess } from "@/server/auth/session"
import { ENTITY_TYPE_LABELS, type QlooEntityType } from "@/server/providers/qloo/types"
import { getComparison, type Comparison } from "@/server/projects/queries"
import { tasteOverlap } from "@/server/research/taste-overlap"

export const metadata = { title: "Compare opportunities" }

type Opp = Comparison["opportunities"][number]

function NA({ children = "Unavailable" }: { children?: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground italic">{children}</span>
}

function analyse(o: Opp) {
  const criteria = evaluationCriteriaSchema.safeParse(o.evaluations[0]?.criteria)
  const commercial = commercialFindingsSchema.omit({ claims: true }).partial().safeParse(o.commercial ?? {})
  const rels = o.evidence.flatMap((e) => (e.relationship ? [e.relationship] : []))
  const domains = [...new Set(rels.map((r) => r.domain))]
  const growth = rels
    .map((r) => (r.explainability as { audienceGrowth?: number | null } | null)?.audienceGrowth)
    .filter((g): g is number => typeof g === "number")
  const verifiedSources = o.claims.filter((c) => c.status === "VERIFIED" && c.sourceId).length
  const completeness = [Boolean(rels.length), Boolean(o.commercialAt), Boolean(o.deepDiveAt), verifiedSources >= 3].filter(Boolean).length
  return {
    criteria: criteria.success ? criteria.data : null,
    commercial: commercial.success && o.commercialAt ? commercial.data : null,
    rels,
    domains,
    growth,
    verifiedSources,
    completeness,
    regions: o.constraints?.regions ?? [],
  }
}

type Row = { label: string; hint?: string; render: (o: Opp, a: ReturnType<typeof analyse>) => React.ReactNode }

function criterion(key: Criterion, inverse = false): Row["render"] {
  return function renderCriterion(_o, a) {
    return a.criteria ? (
      <div className="space-y-1">
        <LevelMeter level={a.criteria[key].level} inverse={inverse} unavailable={a.criteria[key].basis === "UNAVAILABLE"} />
        <p className="line-clamp-3 text-xs text-muted-foreground">{a.criteria[key].rationale}</p>
        <Badge variant="muted" className="text-[10px]">{a.criteria[key].basis === "MEASURED" ? "Measured" : a.criteria[key].basis === "MODEL_ASSESSED" ? "Model assessment" : "No data"}</Badge>
      </div>
    ) : (
      <NA>Not evaluated</NA>
    )
  }
}

const GROUPS: { title: string; note: string; rows: Row[] }[] = [
  {
    title: "Cultural intelligence",
    note: "From Qloo. Affinity indicates shared taste, not demand. Ranks are only comparable within a query.",
    rows: [
      {
        label: "Available affinities",
        render: (_o, a) => (a.rels.length ? <span className="font-mono text-sm">{a.rels.length} Qloo relationships</span> : <NA>None</NA>),
      },
      {
        label: "Relevant interests",
        render: (_o, a) =>
          a.rels.length ? (
            <ul className="flex flex-wrap gap-1">
              {a.rels.slice(0, 6).map((r) => <li key={r.id}><Badge variant="rose">{r.targetEntity.name}</Badge></li>)}
            </ul>
          ) : (
            <NA />
          ),
      },
      {
        label: "Cultural domains",
        render: (_o, a) => (a.domains.length ? a.domains.map((d) => ENTITY_TYPE_LABELS[d as QlooEntityType] ?? d).join(", ") : <NA />),
      },
      {
        label: "Geographic signals",
        render: (_o, a) => (a.regions.length ? `Re-weighted toward ${a.regions[0]}` : <NA>No regional signal applied</NA>),
      },
      {
        label: "Audience growth",
        hint: "Qloo measurement where reported",
        render: (_o, a) => (a.growth.length ? <span className="font-mono text-sm">{a.growth.filter((g) => g > 0).length} of {a.growth.length} entities growing</span> : <NA>Not reported by Qloo</NA>),
      },
      {
        label: "Explainability",
        render: (_o, a) => {
          const scored = a.rels.filter((r) => (r.explainability as { contributors?: unknown[] } | null)?.contributors?.length)
          return scored.length ? `${scored.length} of ${a.rels.length} relationships attributed to specific seeds` : <NA>Not reported</NA>
        },
      },
    ],
  },
  {
    title: "Business intelligence",
    note: "From web research performed for each opportunity.",
    rows: [
      { label: "Commercial model", render: (o) => <p className="line-clamp-4 text-sm">{o.mechanism}</p> },
      {
        label: "Competitors",
        render: (_o, a) => (a.commercial?.competitors?.length ? a.commercial.competitors.map((c) => c.name).join(", ") : <NA>{a.commercial ? "None found" : "Not researched"}</NA>),
      },
      {
        label: "Market research",
        render: (_o, a) => (a.commercial?.marketConditions ? <p className="line-clamp-4 text-sm">{a.commercial.marketConditions}</p> : <NA>Not researched</NA>),
      },
      {
        label: "Estimated costs",
        render: (_o, a) => (a.commercial?.costs ? <p className="line-clamp-4 text-sm">{a.commercial.costs}</p> : <NA>Not established</NA>),
      },
      {
        label: "Partnership dependencies",
        render: (_o, a) => (a.commercial?.dependencies?.length ? <ul className="list-disc pl-4 text-sm">{a.commercial.dependencies.slice(0, 4).map((d) => <li key={d}>{d}</li>)}</ul> : <NA />),
      },
      { label: "Licensing", render: (_o, a) => (a.commercial?.licensing ? <p className="text-sm">{a.commercial.licensing}</p> : <NA />) },
    ],
  },
  {
    title: "Outbranch assessment",
    note: "Model assessments on explicit criteria. Evidence strength and research completeness are computed from collected evidence.",
    rows: [
      { label: "Strategic fit", render: criterion("strategicFit") },
      { label: "Strength of evidence", render: (o) => <EvidenceStrengthBadge strength={o.evidenceStrength} /> },
      { label: "Commercial uncertainty", render: criterion("uncertainty", true) },
      { label: "Competitive differentiation", render: criterion("differentiation") },
      { label: "Feasibility", render: criterion("feasibility") },
      {
        label: "Research completeness",
        hint: "Qloo evidence · commercial research · deep dive · ≥3 verified sources",
        render: (_o, a) => (
          <span className="flex items-center gap-2">
            <span className="flex gap-0.5">{[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 w-4 rounded-full", i <= a.completeness ? "bg-sage-strong" : "bg-muted")} />)}</span>
            <span className="font-mono text-xs">{a.completeness}/4</span>
          </span>
        ),
      },
    ],
  },
]

export default async function ComparePage({ params, searchParams }: PageProps<"/projects/[projectId]/compare">) {
  const { projectId } = await params
  await assertProjectReadAccess(projectId)
  const ids = String((await searchParams).ids ?? "").split(",").filter(Boolean)
  const { opportunities, all } = await getComparison(projectId, ids)
  if (opportunities.length < 2) {
    return <EmptyState icon={GitCompareArrows} title="Not enough opportunities to compare" description="Select at least two opportunities from the portfolio." />
  }
  const analyses = new Map(opportunities.map((o) => [o.id, analyse(o)]))
  const [first, second] = opportunities
  const overlap = await tasteOverlap(
    projectId,
    analyses.get(first.id)!.rels.map((r) => r.targetEntity.qlooId),
    analyses.get(second.id)!.rels.map((r) => r.targetEntity.qlooId),
  )
  const cols = { gridTemplateColumns: `minmax(150px,200px) repeat(${opportunities.length}, minmax(220px,1fr))` }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Opportunity comparison</p>
          <h2 className="text-xl font-semibold">Compare {opportunities.length} growth directions</h2>
        </div>
        <CompareSelector projectId={projectId} all={all} selected={opportunities.map((o) => o.id)} />
      </div>

      {/* Desktop: aligned matrix. Mobile: one card per opportunity. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <div className="grid border-b bg-muted/40" style={cols}>
          <div className="p-4" />
          {opportunities.map((o) => (
            <div key={o.id} className="space-y-2 border-l p-4">
              <CategoryBadge category={o.category as OpportunityCategory} />
              <Link href={`/projects/${projectId}/opportunities/${o.id}`} className="block font-semibold hover:text-primary-ink">
                {o.rank ? `#${o.rank} ` : ""}
                {o.title}
              </Link>
            </div>
          ))}
        </div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="border-b bg-accent/40 px-4 py-2.5">
              <p className="text-sm font-semibold">{g.title}</p>
              <p className="text-xs text-muted-foreground">{g.note}</p>
            </div>
            {g.rows.map((row) => (
              <div key={row.label} className="grid border-b last:border-b-0" style={cols}>
                <div className="p-4">
                  <p className="text-xs font-medium">{row.label}</p>
                  {row.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{row.hint}</p>}
                </div>
                {opportunities.map((o) => (
                  <div key={o.id} className="border-l p-4 text-sm">{row.render(o, analyses.get(o.id)!)}</div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-4 md:hidden">
        {opportunities.map((o) => (
          <article key={o.id} className="rounded-xl border bg-card">
            <div className="space-y-2 border-b p-4">
              <CategoryBadge category={o.category as OpportunityCategory} />
              <Link href={`/projects/${projectId}/opportunities/${o.id}`} className="block font-semibold">{o.title}</Link>
            </div>
            {GROUPS.map((g) => (
              <div key={g.title} className="border-b p-4 last:border-b-0">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.title}</p>
                <dl className="space-y-3">
                  {g.rows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-xs font-medium">{row.label}</dt>
                      <dd className="mt-1 text-sm">{row.render(o, analyses.get(o.id)!)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </article>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Taste overlap: {first.title} × {second.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Qloo analysis/compare over the cultural entities behind each opportunity. High overlap suggests the two directions
          reach the same audience and could share partners or campaigns.
        </p>
        {overlap.status === "ok" ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {overlap.tags.map((t) => (
              <li key={t.name}>
                <Badge variant="sage">
                  {t.name}
                  {t.score !== null && <span className="font-mono opacity-70">{t.score.toFixed(2)}</span>}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Info className="size-4" />{overlap.reason}</p>
        )}
      </section>
    </div>
  )
}
