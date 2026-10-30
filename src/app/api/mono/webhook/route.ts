import { monoInvoiceSchema, verifyMonoSignature } from "@/lib/mono"
import { applyInvoice, fetchWebhookKey } from "@/server/billing/mono"
import { env } from "@/server/env"

let cachedKey: string | undefined

/** monobank advises caching its key and fetching a new one only when verification fails. */
async function verified(signature: string, body: string) {
  cachedKey ??= await fetchWebhookKey()
  if (verifyMonoSignature(cachedKey, signature, body)) return true
  cachedKey = await fetchWebhookKey()
  return verifyMonoSignature(cachedKey, signature, body)
}

export async function POST(request: Request) {
  if (!env.MONO_TOKEN) return new Response("Webhook not configured", { status: 503 })
  const signature = request.headers.get("x-sign")
  if (!signature) return new Response("Missing signature", { status: 400 })

  // The signature covers the raw body, so read it as text, not JSON.
  const body = await request.text()
  if (!(await verified(signature, body))) return new Response("Invalid signature", { status: 400 })

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return new Response("Invalid payload", { status: 400 })
  }
  const parsed = monoInvoiceSchema.safeParse(json)
  if (!parsed.success || !parsed.data.invoiceId) return new Response("Invalid payload", { status: 400 })

  await applyInvoice(parsed.data.invoiceId, parsed.data)
  return new Response(null, { status: 200 })
}
