"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { GitCompareArrows, SlidersHorizontal, X } from "lucide-react"
import { AnalysisConfigForm } from "@/components/research/analysis-config-form"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CATEGORY_LABELS, type AnalysisConfig, type OpportunityCategory } from "@/lib/schemas/discovery"
import { cn } from "@/lib/utils"
import type { PortfolioOpportunity } from "@/server/projects/queries"
import { OpportunityCard } from "./opportunity-card"

const MAX_COMPARE = 4

export function RefineSheet({ projectId, initial }: { projectId: string; initial: Partial<AnalysisConfig> }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal /> Refine
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Refine the research</SheetTitle>
          <SheetDescription>
            Starts a new iteration. Cached Qloo results and your saved or excluded opportunities are reused.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          <AnalysisConfigForm projectId={projectId} initial={initial} compact submitLabel="Run refined discovery" onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function PortfolioView({ projectId, opportunities }: { projectId: string; opportunities: PortfolioOpportunity[] }) {
  const [category, setCategory] = useState<OpportunityCategory | "ALL">("ALL")
  const [savedOnly, setSavedOnly] = useState(false)
  const [showExcluded, setShowExcluded] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const categories = useMemo(() => {
    const counts = new Map<OpportunityCategory, number>()
    for (const o of opportunities) if (o.status === "CANDIDATE") counts.set(o.category as OpportunityCategory, (counts.get(o.category as OpportunityCategory) ?? 0) + 1)
    return [...counts.entries()]
  }, [opportunities])

  const visible = opportunities.filter(
    (o) =>
      (showExcluded || o.status === "CANDIDATE") &&
      (!savedOnly || o.shortlisted) &&
      (category === "ALL" || o.category === category),
  )
  const excludedCount = opportunities.filter((o) => o.status === "EXCLUDED").length

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCategory("ALL")}
            aria-pressed={category === "ALL"}
            className={cn("rounded-full border px-3 py-1 text-xs", category === "ALL" ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:border-border-strong")}
          >
            All
          </button>
          {categories.map(([c, n]) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn("rounded-full border px-3 py-1 text-xs", category === c ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:border-border-strong")}
            >
              {CATEGORY_LABELS[c]} <span className="font-mono text-muted-foreground">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Switch id="saved-only" checked={savedOnly} onCheckedChange={setSavedOnly} />
            <Label htmlFor="saved-only" className="text-xs">
              Shortlist only
            </Label>
          </div>
          {excludedCount > 0 && (
            <div className="flex items-center gap-2">
              <Switch id="show-excluded" checked={showExcluded} onCheckedChange={setShowExcluded} />
              <Label htmlFor="show-excluded" className="text-xs">
                Show excluded ({excludedCount})
              </Label>
            </div>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No opportunities match these filters.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => (
            <OpportunityCard
              key={o.id}
              projectId={projectId}
              opp={o}
              selected={selected.includes(o.id)}
              selectionDisabled={selected.length >= MAX_COMPARE}
              onSelect={(checked) => setSelected((s) => (checked ? [...s, o.id] : s.filter((x) => x !== o.id)))}
            />
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:left-60">
          <div className="flex items-center gap-3 rounded-full border bg-aubergine py-2 pr-2 pl-5 text-sm text-ivory shadow-lg">
            <span>
              {selected.length} selected{selected.length < 2 ? " · pick at least 2" : ""}
            </span>
            <Button size="sm" variant="ghost" className="text-ivory hover:bg-white/10 hover:text-ivory" onClick={() => setSelected([])} aria-label="Clear selection">
              <X />
            </Button>
            <Button asChild size="sm" disabled={selected.length < 2} className="rounded-full">
              <Link
                href={`/projects/${projectId}/compare?ids=${selected.join(",")}`}
                aria-disabled={selected.length < 2}
                className={cn(selected.length < 2 && "pointer-events-none opacity-50")}
              >
                <GitCompareArrows /> Compare
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
