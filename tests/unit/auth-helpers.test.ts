import { describe, expect, it } from "vitest"
import { safeNext } from "@/server/auth/next"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { supportsDynamicWebTools, supportsFallback } from "@/server/providers/anthropic/models"
import { tasteOverlap } from "@/server/research/taste-overlap"

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/projects/new")).toBe("/projects/new")
  })

  it("rejects absolute and protocol-relative targets", () => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "", undefined, ["/a"]]) {
      expect(safeNext(next)).toBe("/projects")
    }
  })
})

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse battery")
    expect(stored).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(await verifyPassword("correct horse battery", stored)).toBe(true)
    expect(await verifyPassword("wrong horse battery", stored)).toBe(false)
  })

  it("salts each hash", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"))
  })

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("x", "plaintext")).toBe(false)
    expect(await verifyPassword("x", "bcrypt$aa$bb")).toBe(false)
  })
})

describe("model capabilities", () => {
  it("keeps Haiku off server-side fallback and dynamic web tools", () => {
    expect(supportsFallback("claude-haiku-5-5")).toBe(false)
    expect(supportsDynamicWebTools("claude-haiku-5-5")).toBe(false)
    expect(supportsFallback("claude-sonnet-5-5")).toBe(true)
    expect(supportsDynamicWebTools("claude-sonnet-5-5")).toBe(true)
  })
})

describe("tasteOverlap", () => {
  it("does not send simulated entity ids to Qloo", async () => {
    const result = await tasteOverlap("project", ["sim-trail-podcast"], ["sim-banjo-duo"])
    expect(result).toEqual({ status: "unavailable", reason: expect.stringMatching(/simulated data/) })
  })
})
