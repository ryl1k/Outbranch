"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Bookmark, BookmarkCheck, Eye, EyeOff, Network } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { OpportunityCategory } from "@/lib/schemas/discovery"
import { cn } from "@/lib/utils"
import { setOpportunityExcluded, toggleShortlist } from "@/server/projects/actions"
import type { PortfolioOpportunity } from "@/server/projects/queries"
import { CategoryBadge, EvidenceStrengthBadge } from "./badges"

export function OpportunityCard({
  projectId,
  opp,
  selected,
  onSelect,
  selectionDisabled,
}: {
  projectId: string
  opp: PortfolioOpportunity
  selected: boolean
  onSelect: (checked: boolean) => void
  selectionDisabled: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const excluded = opp.status === "EXCLUDED"
  const entities = [...new Map(opp.qlooEntities.map((e) => [e.id, e])).values()].slice(0, 3)

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, message: string) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(message)
        router.refresh()
      }
    })

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card shadow-soft transition-colors",
        selected && "border-primary ring-2 ring-primary/10",
        excluded && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3 p-5 pb-0">
        {opp.rank && !excluded ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-mono text-xs font-medium text-primary-foreground">
            {opp.rank}
          </span>
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs text-muted-foreground">–</span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={opp.category as OpportunityCategory} />
            <EvidenceStrengthBadge strength={opp.evidenceStrength} />
            {excluded && <Badge variant="muted">Excluded</Badge>}
          </div>
          <h3 className="text-base leading-snug font-semibold">
            <Link href={`/projects/${projectId}/opportunities/${opp.id}`} className="after:absolute after:inset-0 hover:text-primary dark:hover:text-rose">
              {opp.title}
            </Link>
          </h3>
        </div>
        <label className="relative z-10 flex items-center" title="Select to compare">
          <Checkbox
            checked={selected}
            disabled={selectionDisabled && !selected}
            onCheckedChange={(v) => onSelect(v === true)}
            aria-label={`Compare ${opp.title}`}
          />
        </label>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="line-clamp-3 text-sm text-foreground/80">{opp.summary}</p>

        {entities.length > 0 && (
          <div className="mt-auto space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Network className="size-3.5" /> Qloo affinity with
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {entities.map((e) => (
                <li key={e.id} className="max-w-full">
                  <Badge variant="rose" className="max-w-full" title={e.name}>
                    <span className="truncate">{e.name}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="relative z-10 flex items-center justify-between gap-2 border-t px-3 py-2">
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending || excluded}
                aria-label={opp.shortlisted ? "Remove from shortlist" : "Save to shortlist"}
                onClick={() => act(() => toggleShortlist(projectId, opp.id, !opp.shortlisted), opp.shortlisted ? "Removed from shortlist" : "Saved to shortlist")}
              >
                {opp.shortlisted ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{opp.shortlisted ? "Saved" : "Save"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={excluded ? "Restore opportunity" : "Exclude opportunity"}
                onClick={() => act(() => setOpportunityExcluded(projectId, opp.id, !excluded), excluded ? "Restored" : "Excluded")}
              >
                {excluded ? <Eye /> : <EyeOff />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{excluded ? "Restore" : "Exclude from ranking and future runs"}</TooltipContent>
          </Tooltip>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-primary dark:text-white dark:hover:text-primary">
          <Link href={`/projects/${projectId}/opportunities/${opp.id}`}>
            View details <ArrowRight />
          </Link>
        </Button>
      </footer>
    </article>
  )
}
