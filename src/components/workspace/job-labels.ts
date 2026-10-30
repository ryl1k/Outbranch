import type { Badge } from "@/components/ui/badge"

/** Research job names and status colours, shared by the workspace activity page and each project's research log. */
export const JOB_KIND: Record<string, string> = {
  RESOLVE_ENTITY: "Entity resolution",
  BRAND_RESEARCH: "Brand research",
  DISCOVERY: "Opportunity discovery",
  DEEP_DIVE: "Deep research",
  REPORT: "Report",
}

export const JOB_STATUS: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  QUEUED: "muted",
  RUNNING: "info",
  SUCCEEDED: "success",
  PARTIAL: "warning",
  FAILED: "danger",
  CANCELLED: "muted",
}

export function jobDuration(start: Date | null, end: Date | null) {
  if (!start || !end) return "—"
  const s = Math.round((end.getTime() - start.getTime()) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}
