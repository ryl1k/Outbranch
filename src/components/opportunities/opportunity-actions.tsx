"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, BookmarkCheck, Loader2, Telescope } from "lucide-react"
import { toastActionError } from "@/components/billing/paywall-toast"
import { GenerateReportButton } from "@/components/reports/report-actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { requestDeepDive, toggleShortlist } from "@/server/projects/actions"

export function OpportunityActions({
  projectId,
  opportunityId,
  shortlisted,
  researching,
  hasDeepDive,
}: {
  projectId: string
  opportunityId: string
  shortlisted: boolean
  researching: boolean
  hasDeepDive: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string; paywall?: boolean }>, ok: string) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) toastActionError(res, router)
      else {
        toast.success(ok)
        router.refresh()
      }
    })

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => run(() => toggleShortlist(projectId, opportunityId, !shortlisted), shortlisted ? "Removed from shortlist" : "Saved")}
      >
        {shortlisted ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
        {shortlisted ? "Saved" : "Save"}
      </Button>
      <GenerateReportButton projectId={projectId} opportunityId={opportunityId} label="Brief" variant="outline" />
      <Button
        disabled={pending || researching}
        onClick={() => run(() => requestDeepDive(projectId, opportunityId), "Deep research started")}
      >
        {researching || pending ? <Loader2 className="animate-spin" /> : <Telescope />}
        {researching ? "Researching…" : hasDeepDive ? "Refresh deep research" : "Research deeper"}
      </Button>
    </div>
  )
}
