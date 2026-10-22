import { beforeEach, describe, expect, it, vi } from "vitest"

const send = vi.fn()
vi.mock("@/server/jobs/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/jobs/client")>()
  return { ...actual, inngest: { ...actual.inngest, send: (...args: unknown[]) => send(...args) } }
})

const { db } = await import("@/server/db")
const lifecycle = await import("@/server/jobs/lifecycle")
const { persistBrandProfile } = await import("@/server/research/brand")
const { ProviderUnavailableError } = await import("@/server/providers/errors")
const { resetDb, seedProject } = await import("../helpers/db")

const extraction = {
  name: "Acme Soda",
  entityKind: "brand" as const,
  officialUrl: "https://acme.example",
  summary: "A soda brand.",
  industry: "Beverages",
  positioning: "Irreverent",
  products: [{ name: "Cola", description: null }],
  audiences: ["Gen Z"],
  markets: ["US"],
  competitors: ["Other Soda"],
  collaborations: [],
  culturalRefs: [{ name: "Some Band", type: "artist" as const, why: "Tour sponsor" }],
  themes: ["Punk Culture", "punk culture", "Skate"],
  claims: [
    { topic: "identity" as const, statement: "Founded in 2019.", status: "VERIFIED" as const, sourceIndex: 0 },
    { topic: "products" as const, statement: "Sells cola.", status: "VERIFIED" as const, sourceIndex: 9 },
    { topic: "audience" as const, statement: "Young audience.", status: "INFERRED" as const, sourceIndex: null },
  ],
}
const sources = [{ url: "https://press.example/a", title: "Press", citedText: "Founded 2019" }]

describe("brand profile persistence (integration)", () => {
  beforeEach(resetDb)

  it("classifies evidence, adds user context, dedupes themes and is idempotent on re-run", async () => {
    const { project } = await seedProject()
    await db.project.update({ where: { id: project.id }, data: { userContext: { industry: "Soft drinks" } } })
    const job = await db.researchJob.create({ data: { projectId: project.id, kind: "BRAND_RESEARCH", status: "RUNNING" } })
    const ctx = lifecycle.jobContext(job.id, project.id)

    await persistBrandProfile(ctx, extraction, sources)
    await persistBrandProfile(ctx, extraction, sources)

    const claims = await db.claim.findMany({ where: { projectId: project.id }, orderBy: { statement: "asc" } })
    expect(claims.map((c) => [c.statement, c.status])).toEqual([
      ["Founded in 2019.", "VERIFIED"],
      ["Sells cola.", "INFERRED"], // cited a source that does not exist
      ["Soft drinks", "USER_PROVIDED"],
      ["Young audience.", "INFERRED"],
    ])
    expect(claims.find((c) => c.status === "VERIFIED")?.sourceId).toBeTruthy()
    const profile = await db.brandProfile.findUniqueOrThrow({ where: { projectId: project.id } })
    expect(profile).toMatchObject({ status: "DRAFT", version: 2, name: "Acme Soda" })
    expect((await db.brandTheme.findMany({ where: { projectId: project.id } })).map((t) => t.label).sort()).toEqual([
      "punk culture",
      "skate",
    ])
    expect(await db.researchSource.count({ where: { projectId: project.id } })).toBe(1)
  })
})

describe("job lifecycle (integration)", () => {
  beforeEach(async () => {
    await resetDb()
    send.mockReset()
    send.mockResolvedValue({ ids: ["evt_1"] })
  })

  it("enqueues once per active job and records the event id", async () => {
    const { project, workspace } = await seedProject()
    const a = await lifecycle.enqueueJob({ projectId: project.id, workspaceId: workspace.id, kind: "BRAND_RESEARCH" })
    const b = await lifecycle.enqueueJob({ projectId: project.id, workspaceId: workspace.id, kind: "BRAND_RESEARCH" })
    expect(a.id).toBe(b.id)
    expect(a.inngestEventId).toBe("evt_1")
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatchObject({ name: "research/brand.requested", data: { projectId: project.id, jobId: a.id } })
  })

  it("marks the job failed when the background service is unreachable", async () => {
    const { project, workspace } = await seedProject()
    send.mockRejectedValueOnce(new Error("ECONNREFUSED"))
    await expect(lifecycle.enqueueJob({ projectId: project.id, workspaceId: workspace.id, kind: "RESOLVE_ENTITY" })).rejects.toThrow()
    expect((await db.researchJob.findFirstOrThrow()).status).toBe("FAILED")
  })

  it("cancellation stops further stages and leaves the project actionable", async () => {
    const { project } = await seedProject("CONFIGURING")
    await db.project.update({ where: { id: project.id }, data: { stage: "DISCOVERING" } })
    const job = await db.researchJob.create({ data: { projectId: project.id, kind: "DISCOVERY", status: "RUNNING" } })
    const ctx = lifecycle.jobContext(job.id, project.id)

    await lifecycle.requestCancel(job.id)
    await expect(ctx.stage("cultural", "next stage")).rejects.toBeInstanceOf(lifecycle.JobCancelledError)
    expect((await db.project.findUniqueOrThrow({ where: { id: project.id } })).stage).toBe("CONFIGURING")
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ name: "research/job.cancelled", data: { jobId: job.id } }))

    // A later failure report must not overwrite the cancellation.
    await lifecycle.markFailed(job.id, new Error("late"))
    expect((await db.researchJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("CANCELLED")
  })

  it("stores user-safe failure messages", async () => {
    const { project } = await seedProject()
    const job = await db.researchJob.create({ data: { projectId: project.id, kind: "BRAND_RESEARCH", status: "RUNNING" } })
    await lifecycle.markFailed(job.id, new ProviderUnavailableError("qloo", "QLOO_API_KEY is not configured"))
    const failed = await db.researchJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(failed.error).toBe("Qloo is not configured. Switch to fixture mode or add credentials.")
    expect(failed.error).not.toContain("QLOO_API_KEY")
  })
})
