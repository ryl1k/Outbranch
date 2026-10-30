import "server-only"
import { cache } from "react"
import { notFound, redirect } from "next/navigation"
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
  if (!project) {
    const showcase = await db.project.count({ where: { id: projectId, isShowcase: true } })
    if (showcase) throw new AuthError("Showcase projects are read-only. Start your own research to try this.", 403)
    throw new AuthError("Project not found", 404)
  }
  return { viewer: v, project }
}

/**
 * Read-only access: the viewer's own projects plus published showcase projects.
 * Mutations must keep using assertProjectAccess, which requires ownership.
 */
export async function assertProjectReadAccess(projectId: string, viewer?: Viewer) {
  const v = viewer ?? (await assertViewer())
  const project = await db.project.findFirst({
    where: { id: projectId, OR: [{ workspaceId: v.workspace.id }, { isShowcase: true }] },
  })
  if (!project) throw new AuthError("Project not found", 404)
  return { viewer: v, project, readOnly: project.workspaceId !== v.workspace.id }
}

/** For pages: a project the viewer cannot read shows the 404 page instead of crashing the render. */
export async function requireProjectRead(projectId: string) {
  try {
    return await assertProjectReadAccess(projectId)
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound()
    throw error
  }
}
