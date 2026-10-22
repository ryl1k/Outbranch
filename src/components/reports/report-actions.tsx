"use client"

import { useTransition } from "react"
import { Download, FileText, Loader2, Printer, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createReport, deleteReport } from "@/server/projects/actions"

export function GenerateReportButton({
  projectId,
  opportunityId,
  label = "Generate report",
  variant = "default",
}: {
  projectId: string
  opportunityId?: string
  label?: string
  variant?: "default" | "outline"
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createReport(projectId, opportunityId)
          if (res && !res.ok) toast.error(res.error)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <FileText />} {label}
    </Button>
  )
}

export function ReportToolbar({ projectId, reportId }: { projectId: string; reportId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Print / Save as PDF
      </Button>
      <Button asChild variant="outline">
        <a href={`/api/reports/${reportId}/markdown`} download>
          <Download /> Markdown
        </a>
      </Button>
      <Button
        variant="ghost"
        disabled={pending}
        className="text-muted-foreground"
        onClick={() =>
          start(async () => {
            const res = await deleteReport(projectId, reportId)
            if (!res.ok) toast.error(res.error)
            else router.push(`/projects/${projectId}/reports`)
          })
        }
      >
        <Trash2 /> Delete
      </Button>
    </div>
  )
}
