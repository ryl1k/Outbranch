import { beforeEach, describe, expect, it } from "vitest"

const { db } = await import("@/server/db")
const { assertLoginBudget, recordLoginFailure } = await import("@/server/security/rate-limit")
const { ensurePersonalWorkspace } = await import("@/server/auth/workspace")
const { resetDb } = await import("../helpers/db")

beforeEach(resetDb)

describe("login throttling", () => {
  it("refuses an address after ten recent failures, independently of other addresses", async () => {
    for (let i = 0; i < 9; i++) await recordLoginFailure("a@example.com")
    expect(await assertLoginBudget("a@example.com")).toBe(true)
    await recordLoginFailure("a@example.com")
    expect(await assertLoginBudget("a@example.com")).toBe(false)
    expect(await assertLoginBudget("b@example.com")).toBe(true)
  })

  it("forgets failures outside the window", async () => {
    const old = new Date(Date.now() - 16 * 60 * 1000)
    await db.loginFailure.createMany({ data: Array.from({ length: 10 }, () => ({ email: "a@example.com", createdAt: old })) })
    expect(await assertLoginBudget("a@example.com")).toBe(true)
  })
})

describe("ensurePersonalWorkspace", () => {
  it("names the workspace after its owner, or plainly when unnamed, and creates it once", async () => {
    const named = await db.user.create({ data: { name: "Ada" } })
    const unnamed = await db.user.create({ data: {} })
    const first = await ensurePersonalWorkspace(named.id, "Ada")
    expect(await ensurePersonalWorkspace(named.id, "Ada")).toBe(first)
    await ensurePersonalWorkspace(unnamed.id, null)
    const names = (await db.workspace.findMany({ orderBy: { createdAt: "asc" } })).map((w) => w.name)
    expect(names).toEqual(["Ada's workspace", "My workspace"])
  })
})
