import Link from "next/link"
import { AlertTriangle, ArrowRight, Bookmark, Network, Sparkles } from "lucide-react"
import { RefineSheet } from "@/components/opportunities/portfolio-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AnalysisConstraints } from "@/generated/prisma/client"
import { CATEGORY_LABELS, type OpportunityCategory } from "@/lib/schemas/discovery"
import { constraintsToConfig } from "@/server/projects/presenters"
import type { Portfolio } from "@/server/projects/queries"
import { CATEGORY_ICONS, EvidenceStrengthBadge } from "./badges"

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="font-mono text-2xl font-medium">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ConstraintChips({ c }: { c: AnalysisConstraints | null }) {
  if (!c) return null
  const chips = [
    ...c.focusCategories.map((x) => `Focus: ${CATEGORY_LABELS[x as OpportunityCategory] ?? x}`),
    ...c.regions.map((r) => `Region: ${r}`),
    ...c.excludedCategories.map((x) => `Excluding ${x}`),
    c.riskAppetite ? `Risk appetite: ${c.riskAppetite}` : null,
  ].filter(Boolean) as string[]
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.length ? chips.map((x) => <Badge key={x} variant="outline">{x}</Badge>) : <Badge variant="muted">No filters: all categories</Badge>}
    </div>
  )
}

export function ProjectOverview({ projectId, portfolio }: { projectId: string; portfolio: Portfolio }) {
  const active = portfolio.opportunities.filter((o) => o.status === "CANDIDATE")
  const top = active.slice(0, 3)
  const saved = portfolio.opportunities.filter((o) => o.shortlisted)
  const investigated = active.filter((o) => o.commercialAt).length
  const limitations = portfolio.lastDiscovery?.events ?? []
  const categoryCounts = new Map<OpportunityCategory, number>()
  for (const o of active) categoryCounts.set(o.category as OpportunityCategory, (categoryCounts.get(o.category as OpportunityCategory) ?? 0) + 1)
  const maxCount = Math.max(1, ...categoryCounts.values())

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">Research overview · iteration {portfolio.latestConstraints?.iteration ?? 1}</p>
          <h2 className="font-editorial text-3xl">Where this brand could grow next</h2>
          <ConstraintChips c={portfolio.latestConstraints} />
        </div>
        <div className="flex gap-2">
          <RefineSheet projectId={projectId} initial={constraintsToConfig(portfolio.latestConstraints)} />
          <Button asChild>
            <Link href={`/projects/${projectId}/opportunities`}>
              All opportunities <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Opportunities evaluated" value={active.length} />
        <Stat label="Commercially investigated" value={investigated} hint="With sourced web research" />
        <Stat label="Qloo relationships analysed" value={portfolio.relationshipCount} />
        <Stat label="Cultural insights" value={portfolio.insights.length} />
      </div>

      {limitations.length > 0 && (
        <section className="rounded-xl border border-warning/30 bg-warning-soft/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle className="size-4" /> Research limitations in the latest run
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-foreground/80">
            {limitations.map((e) => <li key={e.id}>{e.message}</li>)}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Top growth opportunities</h3>
            <Link href={`/projects/${projectId}/opportunities`} className="text-xs text-primary-ink hover:underline">View all</Link>
          </div>
          <ol className="mt-4 divide-y">
            {top.map((o) => (
              <li key={o.id}>
                <Link href={`/projects/${projectId}/opportunities/${o.id}`} className="group flex items-start gap-3 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-mono text-xs text-primary-foreground">{o.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium group-hover:text-primary-ink">{o.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{o.summary}</p>
                    <div className="mt-2"><EvidenceStrengthBadge strength={o.evidenceStrength} /></div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Opportunity mix</h3>
          <ul className="mt-4 space-y-3">
            {[...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => {
              const Icon = CATEGORY_ICONS[cat]
              return (
                <li key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" />{CATEGORY_LABELS[cat]}</span>
                    <span className="font-mono text-xs">{n}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${(n / maxCount) * 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-6 w-full">
            <Link href={`/projects/${projectId}/network`}><Network /> Explore the cultural network</Link>
          </Button>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-rose-strong" /> Cultural insights</h3>
          {portfolio.insights.length === 0 && <p className="text-sm text-muted-foreground">No insights in the latest run.</p>}
          {portfolio.insights.map((i) => (
            <div key={i.id} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{i.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
            </div>
          ))}
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold"><Bookmark className="size-4 text-primary-ink" /> Shortlist</h3>
          {saved.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Save opportunities to build a shortlist for comparison and reporting.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {saved.map((o) => (
                <li key={o.id}>
                  <Link href={`/projects/${projectId}/opportunities/${o.id}`} className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40">
                    <span>{o.title}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
