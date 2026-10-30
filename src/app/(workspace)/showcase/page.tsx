import { redirect } from "next/navigation"
import { db } from "@/server/db"
import { requireViewer } from "@/server/auth/session"

/** Entry point for judges and visitors: open the most recently updated showcase. */
export default async function ShowcasePage() {
  await requireViewer()
  const showcase = await db.project.findFirst({ where: { isShowcase: true, archivedAt: null }, orderBy: { updatedAt: "desc" } })
  redirect(showcase ? `/projects/${showcase.id}` : "/projects/new")
}
