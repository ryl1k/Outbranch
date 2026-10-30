import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { ReportToolbar } from "@/components/reports/report-actions"
import { assertProjectReadAccess } from "@/server/auth/session"
import { db } from "@/server/db"

export default async function ReportPage({ params }: PageProps<"/projects/[projectId]/reports/[reportId]">) {
  const { projectId, reportId } = await params
  await assertProjectReadAccess(projectId)
  const report = await db.report.findFirst({ where: { id: reportId, projectId } })
  if (!report) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href={`/projects/${projectId}/reports`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All reports
        </Link>
        <ReportToolbar projectId={projectId} reportId={report.id} />
      </div>

      <article className="report mx-auto max-w-3xl rounded-2xl border bg-card px-6 py-10 shadow-soft sm:px-12 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-8 flex items-center justify-between border-b pb-4">
          <Logo className="text-lg" />
          <span className="font-mono text-xs text-muted-foreground">See further. Grow smarter.</span>
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            ),
          }}
        >
          {report.markdown}
        </ReactMarkdown>
      </article>
    </div>
  )
}
