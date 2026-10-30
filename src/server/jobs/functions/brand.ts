import { db } from "@/server/db"
import { extractBrandProfile, persistBrandProfile, researchBrandWeb, resolveBrandInQloo } from "@/server/research/brand"
import { resolveEntity } from "@/server/research/resolve"
import { events, inngest, jobOptions } from "../client"
import { enqueueJob, jobContext, markFailed, markFinished, markRunning } from "../lifecycle"

export const resolveEntityJob = inngest.createFunction(
  { ...jobOptions("resolve-entity"), triggers: [events.resolveRequested] },
  async ({ event, step }) => {
    const { projectId, jobId, workspaceId } = event.data
    const job = jobContext(jobId, projectId)
    try {
      await step.run("start", async () => {
        await markRunning(jobId)
        await db.project.update({ where: { id: projectId }, data: { stage: "RESOLVING" } })
      })

      const resolution = await step.run("resolve", () => resolveEntity(job))

      const outcome = await step.run("save-candidates", async () => {
        await db.brandCandidate.deleteMany({ where: { projectId } })
        const autoSelect = !resolution.ambiguous && !resolution.notFound && resolution.candidates.length > 0
        await db.brandCandidate.createMany({
          data: resolution.candidates.map((c, i) => ({
            projectId,
            name: c.name,
            kind: c.kind,
            description: c.description,
            url: c.url,
            parentName: c.parentName,
            selected: autoSelect && i === 0,
          })),
        })
        if (autoSelect) {
          await job.note("resolve.decide", `Identified ${resolution.candidates[0].name}`, "SUCCESS")
          return "selected" as const
        }
        await db.project.update({ where: { id: projectId }, data: { stage: "NEEDS_SELECTION" } })
        await job.note(
          "resolve.decide",
          resolution.notFound ? `No verifiable entity found. ${resolution.explanation}` : resolution.explanation,
          resolution.notFound ? "ERROR" : "WARNING",
        )
        return resolution.notFound ? ("not-found" as const) : ("ambiguous" as const)
      })

      await step.run("finish", async () => {
        await markFinished(
          jobId,
          "SUCCEEDED",
          outcome === "selected" ? "Entity identified" : "Waiting for you to confirm the entity",
        )
        if (outcome === "selected") await enqueueJob({ projectId, workspaceId, kind: "BRAND_RESEARCH" })
      })
      return { outcome }
    } catch (error) {
      await step.run("mark-failed", async () => {
        await markFailed(jobId, error)
        await db.project.update({ where: { id: projectId }, data: { stage: "FAILED" } })
      })
      return { outcome: "failed" }
    }
  },
)

export const brandResearchJob = inngest.createFunction(
  { ...jobOptions("brand-research"), triggers: [events.brandRequested] },
  async ({ event, step }) => {
    const { projectId, jobId } = event.data
    const job = jobContext(jobId, projectId)
    try {
      await step.run("start", async () => {
        await markRunning(jobId)
        await db.project.update({ where: { id: projectId }, data: { stage: "RESEARCHING_BRAND" } })
      })

      const research = await step.run("web-research", () => researchBrandWeb(job))
      const extraction = await step.run("extract-profile", () => extractBrandProfile(job, research))
      await step.run("persist-profile", () => persistBrandProfile(job, extraction, research.sources))

      let partial = false
      try {
        await step.run("qloo-resolution", () => resolveBrandInQloo(job))
      } catch (error) {
        partial = true
        await step.run("qloo-degraded", () =>
          job.note("qloo.entity", `Qloo resolution failed: ${(error as Error).message}`, "ERROR"),
        )
      }

      await step.run("finish", async () => {
        await db.project.update({ where: { id: projectId }, data: { stage: "NEEDS_CONFIRMATION" } })
        await markFinished(
          jobId,
          partial ? "PARTIAL" : "SUCCEEDED",
          partial
            ? "Brand profile ready, but Qloo resolution is incomplete. Review before continuing."
            : "Brand profile ready for your review",
        )
      })
    } catch (error) {
      await step.run("mark-failed", async () => {
        await markFailed(jobId, error)
        await db.project.update({ where: { id: projectId }, data: { stage: "FAILED" } })
      })
    }
  },
)
