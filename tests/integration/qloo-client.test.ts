import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/server/db"
import { ProviderResponseError } from "@/server/providers/errors"
import { qloo } from "@/server/providers/qloo/client"
import { resetDb, seedProject } from "../helpers/db"

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })
const searchBody = { results: [{ name: "Acme", entity_id: "A1", types: ["urn:entity:brand"], popularity: 0.5 }] }

describe("Qloo client (integration)", () => {
  let projectId: string
  beforeEach(async () => {
    await resetDb()
    projectId = (await seedProject()).project.id
  })
  afterEach(() => vi.unstubAllGlobals())

  it("sends the documented auth header and GET encoding, then serves repeats from the cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(searchBody))
    vi.stubGlobal("fetch", fetchMock)

    const first = await qloo.searchEntities({ projectId, operation: "t" }, "Acme", { types: ["urn:entity:brand"] })
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe("https://qloo.test/search?query=Acme&take=5&types=urn%3Aentity%3Abrand")
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("test-qloo-key")
    expect(first.cached).toBe(false)

    const second = await qloo.searchEntities({ projectId, operation: "t" }, "Acme", { types: ["urn:entity:brand"] })
    expect(second.cached).toBe(true)
    expect(second.queryId).toBe(first.queryId)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const usage = await db.usageRecord.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } })
    expect(usage.map((u) => u.cacheHit)).toEqual([false, true])
  })

  it("retries rate limits with bounded attempts and records the retry count", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(ok(searchBody))
    vi.stubGlobal("fetch", fetchMock)

    const res = await qloo.searchEntities({ projectId, operation: "t" }, "Retry Co")
    expect(res.data.results[0].name).toBe("Acme")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const usage = await db.usageRecord.findFirstOrThrow({ where: { projectId } })
    expect(usage.retries).toBe(1)
  }, 15_000)

  it("gives up after the retry budget on persistent server errors", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response("{}", { status: 503, headers: { "retry-after": "0" } }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(qloo.searchEntities({ projectId, operation: "t" }, "Down Co")).rejects.toBeInstanceOf(ProviderResponseError)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(await db.qlooQuery.count()).toBe(0)
  }, 20_000)

  it("surfaces Qloo validation errors without retrying or caching them", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "filter.type is not supported" }] }), { status: 400 }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(
      qloo.insights({ projectId, operation: "t" }, { "filter.type": "urn:entity:brand", take: 1 }),
    ).rejects.toThrow(/filter.type is not supported/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await db.qlooQuery.count()).toBe(0)
  })

  it("rejects unexpected response shapes instead of passing them on", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ unexpected: true })))
    await expect(qloo.searchEntities({ projectId, operation: "t" }, "Odd Co")).rejects.toThrow(/response shape/)
  })

  it("returns an empty result set as data, not as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ success: true, results: { entities: [] } })))
    const res = await qloo.insights({ projectId, operation: "t" }, { "filter.type": "urn:entity:artist", take: 5 })
    expect(res.data.results.entities).toEqual([])
  })
})
