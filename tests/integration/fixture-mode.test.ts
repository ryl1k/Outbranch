import { beforeEach, describe, expect, it, vi } from "vitest"

// Fixture mode without a Qloo key: set before any server module reads the environment.
process.env.PROVIDER_MODE = "fixture"
delete process.env.QLOO_API_KEY

const { db } = await import("@/server/db")
const { jobContext } = await import("@/server/jobs/lifecycle")
const { loadDiscoveryContext } = await import("@/server/research/discovery/context")
const { gatherCulturalSignals, loadSeeds, relationshipTable } = await import("@/server/research/discovery/cultural")
const { qlooAvailable, qlooMode } = await import("@/server/providers/qloo/client")
const { resetDb, seedProject } = await import("../helpers/db")

describe("fixture mode (integration)", () => {
  beforeEach(resetDb)

  it("runs the cultural stage without credentials and labels everything as simulated", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(qlooMode()).toBe("FIXTURE")
    expect(qlooAvailable()).toBe(true)

    const { project } = await seedProject("DISCOVERING")
    const brand = await db.qlooEntity.create({ data: { qlooId: "fixture:acme", name: "Simulated Acme", types: ["urn:entity:brand"], dataMode: "FIXTURE" } })
    await db.brandProfile.create({
      data: { projectId: project.id, status: "CONFIRMED", name: "Acme", entityKind: "brand", summary: "Test brand.", qlooEntityId: brand.id },
    })
    const job = await db.researchJob.create({ data: { projectId: project.id, kind: "DISCOVERY", status: "RUNNING" } })
    const ctx = await loadDiscoveryContext(project.id, null)
    const seeds = await loadSeeds(ctx)

    const res = await gatherCulturalSignals(jobContext(job.id, project.id), ctx, { domains: [{ type: "urn:entity:artist", rationale: "test" }] }, seeds)

    expect(res).toEqual({ total: 10, failures: [] })
    expect(fetchSpy).not.toHaveBeenCalled()
    const rels = await db.culturalRelationship.findMany({ where: { projectId: project.id }, include: { targetEntity: true } })
    expect(rels.every((r) => r.dataMode === "FIXTURE")).toBe(true)
    expect(rels.every((r) => r.targetEntity.name.startsWith("Simulated") && r.targetEntity.qlooId.startsWith("fixture:"))).toBe(true)
    expect((await relationshipTable(project.id)).count).toBe(10)
  })
})
