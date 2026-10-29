import "server-only"
import { db } from "@/server/db"

/** Every account gets one private workspace, created on first sign-in. */
export async function ensurePersonalWorkspace(userId: string, owner: string | null) {
  const existing = await db.workspaceMember.findFirst({ where: { userId } })
  if (existing) return existing.workspaceId
  const workspace = await db.workspace.create({
    data: { name: owner ? `${owner}'s workspace` : "My workspace", members: { create: { userId, role: "OWNER" } } },
  })
  return workspace.id
}
