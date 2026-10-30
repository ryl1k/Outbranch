import { createVerify } from "node:crypto"
import { z } from "zod"

/** The invoice status response; webhooks post the same shape. */
export const monoInvoiceSchema = z.object({
  invoiceId: z.string().optional(),
  status: z.enum(["created", "processing", "hold", "success", "failure", "reversed", "expired"]),
  modifiedDate: z.string().nullish(),
  failureReason: z.string().nullish(),
  // The token arrives a few seconds after the payment; until then the wallet status is "new".
  walletData: z.object({ cardToken: z.string().optional(), walletId: z.string(), status: z.string() }).nullish(),
})

export type MonoInvoice = z.infer<typeof monoInvoiceSchema>

/** Webhooks are signed with ECDSA over the exact raw body; key and signature are base64. */
export function verifyMonoSignature(publicKeyBase64: string, signatureBase64: string, rawBody: string) {
  try {
    const verifier = createVerify("SHA256")
    verifier.update(rawBody)
    verifier.end()
    return verifier.verify(Buffer.from(publicKeyBase64, "base64"), Buffer.from(signatureBase64, "base64"))
  } catch {
    return false
  }
}

/** One calendar month later, keeping to the last day of a shorter month. */
export function addMonth(date: Date) {
  const next = new Date(date)
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + 1)
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return next
}
