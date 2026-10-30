import { AuthError, assertProjectReadAccess } from "@/server/auth/session"
import { loadCulturalGraph } from "@/server/graph/load"

export const dynamic = "force-dynamic"

/** Cultural network for a project: nodes and provenance-typed edges. */
export async function GET(_request: Request, { params }: RouteContext<"/api/projects/[projectId]/graph">) {
  const { projectId } = await params
  try {
    await assertProjectReadAccess(projectId)
  } catch (error) {
    return Response.json({ error: "Not available" }, { status: error instanceof AuthError ? error.status : 500 })
  }
  return Response.json(await loadCulturalGraph(projectId), { headers: { "cache-control": "private, no-store" } })
}
