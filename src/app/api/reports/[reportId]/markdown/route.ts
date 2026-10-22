import { assertViewer, AuthError } from "@/server/auth/session"
import { db } from "@/server/db"

export const dynamic = "force-dynamic"

function filename(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "outbranch-report"}.md`
}

/** Markdown export, scoped to the viewer's workspace. */
export async function GET(_request: Request, { params }: RouteContext<"/api/reports/[reportId]/markdown">) {
  const { reportId } = await params
  try {
    const viewer = await assertViewer()
    const report = await db.report.findFirst({ where: { id: reportId, project: { workspaceId: viewer.workspace.id } } })
    if (!report) return Response.json({ error: "Not found" }, { status: 404 })
    return new Response(report.markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${filename(report.title)}"`,
        "cache-control": "private, no-store",
      },
    })
  } catch (error) {
    return Response.json({ error: "Not available" }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
