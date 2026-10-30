import { Badge } from "@/components/ui/badge"
import { ResearchTrace } from "@/components/workspace/research-trace"
import { assertProjectReadAccess } from "@/server/auth/session"
import { db } from "@/server/db"

export const metadata = { title: "Research log" }

const KIND: Record<string, string> = {
  RESOLVE_ENTITY: "Entity resolution",
  BRAND_RESEARCH: "Brand research",
  DISCOVERY: "Opportunity discovery",
  DEEP_DIVE: "Deep research",
  REPORT: "Report",
}
const STATUS: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  QUEUED: "muted",
  RUNNING: "info",
  SUCCEEDED: "success",
  PARTIAL: "warning",
  FAILED: "danger",
  CANCELLED: "muted",
}
const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" })

function duration(start: Date | null, end: Date | null) {
  if (!start || !end) return "—"
  const s = Math.round((end.getTime() - start.getTime()) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default async function ActivityPage({ params }: PageProps<"/projects/[projectId]/activity">) {
  const { projectId } = await params
  await assertProjectReadAccess(projectId)
  const jobs = await db.researchJob.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      usage: { select: { provider: true, operation: true, ok: true, cacheHit: true, webSearches: true, createdAt: true } },
      constraints: { select: { iteration: true } },
      opportunity: { select: { title: true } },
    },
  })

  return (
    <div>
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="eyebrow">Research log</p>
          <h2 className="text-xl font-semibold">Every research run, stage by stage</h2>
        </div>
        <ol className="space-y-3">
          {jobs.map((j, i) => (
            <li key={j.id}>
              <details className="group rounded-xl border bg-card" open={i === 0}>
                <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {KIND[j.kind]}
                      {j.constraints && <span className="ml-2 font-mono text-xs text-muted-foreground">iteration {j.constraints.iteration}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmt.format(j.createdAt)} · {duration(j.startedAt, j.finishedAt)} · {j.events.length} events
                      {j.opportunity && ` · ${j.opportunity.title}`}
                    </p>
                  </div>
                  <Badge variant={STATUS[j.status]}>{j.status.toLowerCase()}</Badge>
                </summary>
                {j.usage.length > 0 && (
                  <div className="border-t px-4 py-4">
                    <ResearchTrace calls={j.usage} />
                  </div>
                )}
                <ol className="space-y-1.5 border-t px-4 py-3 text-sm">
                  {j.events.map((e) => (
                    <li key={e.id} className="flex gap-3">
                      <time className="shrink-0 font-mono text-[11px] text-muted-foreground" suppressHydrationWarning>
                        {e.createdAt.toISOString().slice(11, 19)}
                      </time>
                      <span className={e.level === "ERROR" ? "text-destructive" : e.level === "WARNING" ? "text-warning" : ""}>{e.message}</span>
                    </li>
                  ))}
                  {j.error && <li className="text-destructive">{j.error}</li>}
                </ol>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
