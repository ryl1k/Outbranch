import { db } from "@/server/db"

/** Truncate every application table between integration tests. */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length) {
    await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`)
  }
}

/** A user, workspace and project in a given stage. */
export async function seedProject(stage: "INPUT" | "CONFIGURING" | "DISCOVERING" | "READY" = "INPUT") {
  const user = await db.user.create({ data: { name: "Test", isGuest: true } })
  const workspace = await db.workspace.create({
    data: { name: "Test workspace", members: { create: { userId: user.id } } },
  })
  const project = await db.project.create({
    data: { workspaceId: workspace.id, createdById: user.id, name: "Acme", identifier: "Acme", stage },
  })
  return { user, workspace, project }
}
