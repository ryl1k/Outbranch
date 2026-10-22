import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { db } from "@/server/db"
import { auth } from "./config"

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404,
  ) {
    super(message)
  }
}

/** Current user + their workspace, or null. Deduplicated per request. */
export const getViewer = cache(async () => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    include: { user: true, workspace: true },
    orderBy: { createdAt: "asc" },
  })
  if (!membership) return null
  return { user: membership.user, workspace: membership.workspace }
})

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>

/** For pages: redirect to sign-in when unauthenticated. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect("/signin")
  return viewer
}

/** For route handlers / actions: throw instead of redirecting. */
export async function assertViewer(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw new AuthError("Not signed in", 401)
  return viewer
}

/** Authorization: the project must belong to the viewer's workspace. */
export async function assertProjectAccess(projectId: string, viewer?: Viewer) {
  const v = viewer ?? (await assertViewer())
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: v.workspace.id },
  })
  if (!project) throw new AuthError("Project not found", 404)
  return { viewer: v, project }
}
