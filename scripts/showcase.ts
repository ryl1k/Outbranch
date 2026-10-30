/**
 * Publish (or unpublish) a completed project as a read-only showcase.
 * Usage: npx tsx --conditions=react-server scripts/showcase.ts <projectId> [--off]
 */
import "dotenv/config"
import { db } from "@/server/db"

async function main() {
  const [projectId, flag] = process.argv.slice(2)
  if (!projectId) throw new Error("Usage: scripts/showcase.ts <projectId> [--off]")
  const project = await db.project.update({ where: { id: projectId }, data: { isShowcase: flag !== "--off" } })
  console.log(`${project.name}: showcase ${project.isShowcase ? "on" : "off"}`)
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
