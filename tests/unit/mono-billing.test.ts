import { createSign, generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { addMonth, verifyMonoSignature } from "@/lib/mono"

describe("verifyMonoSignature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const key = Buffer.from(publicKey.export({ type: "spki", format: "pem" })).toString("base64")
  const sign = (body: string) => createSign("SHA256").update(body).end().sign(privateKey).toString("base64")

  it("accepts the signed body and rejects anything else", () => {
    const body = '{"invoiceId":"a","status":"success"}'
    expect(verifyMonoSignature(key, sign(body), body)).toBe(true)
    expect(verifyMonoSignature(key, sign(body), body.replace("success", "failure"))).toBe(false)
    expect(verifyMonoSignature(key, "not-a-signature", body)).toBe(false)
  })
})

describe("addMonth", () => {
  it("advances one month and clamps to shorter months", () => {
    expect(addMonth(new Date("2026-10-30T12:00:00Z"))).toEqual(new Date("2026-11-30T12:00:00Z"))
    expect(addMonth(new Date("2027-01-31T00:00:00Z"))).toEqual(new Date("2027-02-28T00:00:00Z"))
    expect(addMonth(new Date("2026-12-15T00:00:00Z"))).toEqual(new Date("2027-01-15T00:00:00Z"))
  })
})
