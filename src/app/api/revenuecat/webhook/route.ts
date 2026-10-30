import { createHash, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { syncWorkspacePlan } from "@/server/billing/revenuecat"
import { db } from "@/server/db"
import { env } from "@/server/env"

const eventSchema = z.object({
  event: z.object({
    app_user_id: z.string().nullish(),
    original_app_user_id: z.string().nullish(),
    aliases: z.array(z.string()).nullish(),
  }),
})

const digest = (value: string) => createHash("sha256").update(value).digest()

export async function POST(request: Request) {
  if (!env.REVENUECAT_WEBHOOK_AUTH || !env.REVENUECAT_SECRET_KEY) return new Response("Webhook not configured", { status: 503 })
  const authorization = request.headers.get("authorization") ?? ""
  if (!timingSafeEqual(digest(authorization), digest(env.REVENUECAT_WEBHOOK_AUTH))) return new Response("Unauthorized", { status: 401 })

  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response("Invalid payload", { status: 400 })

  const { app_user_id, original_app_user_id, aliases } = parsed.data.event
  const ids = [app_user_id, original_app_user_id, ...(aliases ?? [])].filter((id): id is string => Boolean(id))
  const workspace = await db.workspace.findFirst({ where: { id: { in: ids } }, select: { id: true } })
  // Any non-200 is retried, so events for unknown customers are acknowledged and dropped.
  if (!workspace) return new Response(null, { status: 200 })

  // RevenueCat's customer record is the source of truth, whatever this event type was.
  await syncWorkspacePlan(workspace.id)
  return new Response(null, { status: 200 })
}
