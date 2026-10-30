import Link from "next/link"
import { FileText } from "lucide-react"
import { GenerateReportButton } from "@/components/reports/report-actions"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/workspace/primitives"
import { requireProjectRead } from "@/server/auth/session"
import { db } from "@/server/db"

export const metadata = { title: "Reports" }

const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" })

export default async function ReportsPage({ params }: PageProps<"/projects/[projectId]/reports">) {
  const { projectId } = await params
  await requireProjectRead(projectId)
  const [reports, shortlist] = await Promise.all([
    db.report.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, kind: true, createdAt: true } }),
    db.opportunity.findMany({
      where: { projectId, status: "CANDIDATE", shortlistItems: { some: {} } },
      orderBy: { rank: "asc" },
      select: { id: true, title: true },
    }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Reports</p>
          <h2 className="text-xl font-semibold">Share research with your strategy team</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reports restate saved research only, with sources and explicit limitations. Export as Markdown or print to PDF.
          </p>
        </div>
        <GenerateReportButton projectId={projectId} label="Full project report" />
      </div>

      {shortlist.length > 0 && (
        <section className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Opportunity briefs from your shortlist</h3>
          <ul className="mt-3 divide-y">
            {shortlist.map((o) => (
              <li key={o.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">{o.title}</span>
                <GenerateReportButton projectId={projectId} opportunityId={o.id} label="Create brief" variant="outline" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" description="Generate a full report or a brief for any opportunity." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/projects/${projectId}/reports/${r.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{fmt.format(r.createdAt)}</p>
                </div>
                <Badge variant={r.kind === "PROJECT" ? "accent" : "outline"}>{r.kind === "PROJECT" ? "Project report" : "Opportunity brief"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
