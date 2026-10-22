import { db } from "@/server/db"
import { providerStatus } from "@/server/env"

export const dynamic = "force-dynamic"

/** Liveness and configuration diagnostics. Never exposes secrets. */
export async function GET() {
  const started = Date.now()
  let database: "ok" | "error" = "ok"
  try {
    await db.$queryRaw`SELECT 1`
  } catch {
    database = "error"
  }
  const providers = providerStatus()
  const body = {
    status: database === "ok" ? "ok" : "degraded",
    database,
    providers: { anthropic: providers.anthropic, qloo: providers.qloo, mode: providers.mode },
    auth: { github: providers.githubAuth, guest: providers.guestAuth },
    latencyMs: Date.now() - started,
  }
  return Response.json(body, { status: database === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } })
}
