"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, CircleDot, Loader2, Square, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cancelJob } from "@/server/projects/actions"

export type ProgressEvent = {
  id: string
  jobId: string
  stage: string
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
  message: string
  createdAt: string
}

export type ProgressJob = { id: string; kind: string; status: string; stage: string | null }

const ACTIVE = new Set(["QUEUED", "RUNNING"])

const JOB_TITLES: Record<string, string> = {
  RESOLVE_ENTITY: "Identifying the entity",
  BRAND_RESEARCH: "Researching the brand",
  DISCOVERY: "Discovering opportunities",
  DEEP_DIVE: "Deep research",
  REPORT: "Writing the report",
}

const timeFmt = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

function EventIcon({ event, current }: { event: ProgressEvent; current: boolean }) {
  if (current) return <Loader2 className="size-4 animate-spin text-primary" />
  if (event.level === "ERROR") return <XCircle className="size-4 text-destructive" />
  if (event.level === "WARNING") return <AlertTriangle className="size-4 text-warning" />
  if (event.level === "SUCCESS") return <CheckCircle2 className="size-4 text-success" />
  return <CircleDot className="size-4 text-muted-foreground" />
}

export function ResearchProgress({
  projectId,
  initialJobs,
  initialEvents,
  title,
}: {
  projectId: string
  initialJobs: ProgressJob[]
  initialEvents: ProgressEvent[]
  title?: string
}) {
  const router = useRouter()
  const [jobs, setJobs] = useState(initialJobs)
  const [events, setEvents] = useState(initialEvents)
  const [connection, setConnection] = useState<"live" | "reconnecting" | "idle">("live")
  const [pending, startTransition] = useTransition()
  const seen = useRef(new Set(initialEvents.map((e) => e.id)))
  const cursor = useRef(initialEvents.at(-1)?.createdAt ?? null)
  const activeRef = useRef(initialJobs.some((j) => ACTIVE.has(j.status)))

  useEffect(() => {
    let source: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let closed = false

    const connect = () => {
      const url = `/api/projects/${projectId}/events${cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : ""}`
      source = new EventSource(url)
      source.onopen = () => setConnection("live")
      source.addEventListener("events", (msg) => {
        const incoming = (JSON.parse((msg as MessageEvent).data) as ProgressEvent[]).filter((e) => !seen.current.has(e.id))
        if (!incoming.length) return
        incoming.forEach((e) => seen.current.add(e.id))
        cursor.current = incoming.at(-1)!.createdAt
        setEvents((prev) => [...prev, ...incoming])
      })
      source.addEventListener("jobs", (msg) => {
        const next = JSON.parse((msg as MessageEvent).data) as ProgressJob[]
        setJobs(next)
        const nowActive = next.some((j) => ACTIVE.has(j.status))
        if (activeRef.current && !nowActive) router.refresh()
        activeRef.current = nowActive
      })
      source.addEventListener("idle", () => {
        source?.close()
        setConnection("idle")
        if (activeRef.current) router.refresh()
      })
      source.onerror = () => {
        source?.close()
        if (closed || !activeRef.current) return
        setConnection("reconnecting")
        retry = setTimeout(connect, 3000)
      }
    }
    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      source?.close()
    }
  }, [projectId, router])

  const activeJob = jobs.find((j) => ACTIVE.has(j.status))
  const jobEvents = activeJob ? events.filter((e) => e.jobId === activeJob.id) : events.slice(-12)
  const lastId = jobEvents.at(-1)?.id

  return (
    <section
      aria-live="polite"
      aria-busy={Boolean(activeJob)}
      className="rounded-xl border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{activeJob ? "In progress" : "Research log"}</p>
          <h2 className="mt-1 text-lg font-semibold">
            {title ?? (activeJob ? JOB_TITLES[activeJob.kind] : "Latest research activity")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {connection === "reconnecting" && <span className="text-xs text-muted-foreground">Reconnecting…</span>}
          {activeJob && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await cancelJob(projectId, activeJob.id)
                  router.refresh()
                })
              }
            >
              <Square className="size-3" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <ol className="mt-5 space-y-0">
        {jobEvents.length === 0 && activeJob && (
          <li className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Waiting for the research worker to start…
          </li>
        )}
        {jobEvents.map((e) => {
          const current = Boolean(activeJob) && e.id === lastId && e.level === "INFO"
          return (
            <li key={e.id} className="relative flex animate-rise gap-3 pb-3 last:pb-0">
              <span className="relative z-10 mt-0.5 bg-card">
                <EventIcon event={e} current={current} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", current ? "font-medium text-foreground" : "text-foreground/80")}>
                  {e.message}
                </p>
              </div>
              <time className="shrink-0 font-mono text-[11px] text-muted-foreground" dateTime={e.createdAt} suppressHydrationWarning>
                {timeFmt.format(new Date(e.createdAt))}
              </time>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
