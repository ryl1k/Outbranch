import { db } from "@/server/db"
import { inngest } from "../client"
import { emit } from "../lifecycle"

const STALE_AFTER_MS = 30 * 60 * 1000

/**
 * Recovery: jobs whose worker died (deploy, crash, exhausted retries without the
 * failure handler running) are marked failed so the UI can offer a retry, which
 * reuses every stage already persisted.
 */
export const sweepStaleJobs = inngest.createFunction(
  { id: "sweep-stale-jobs", triggers: [{ cron: "*/10 * * * *" }] },
  async ({ step }) => {
    return step.run("mark-stale-jobs", async () => {
      const cutoff = new Date(Date.now() - STALE_AFTER_MS)
      const stale = await db.researchJob.findMany({
        where: {
          status: { in: ["QUEUED", "RUNNING"] },
          createdAt: { lt: cutoff },
          events: { none: { createdAt: { gte: cutoff } } },
        },
        select: { id: true, projectId: true },
      })
      for (const job of stale) {
        await db.researchJob.update({
          where: { id: job.id },
          data: { status: "FAILED", error: "Research was interrupted. Retry to resume.", finishedAt: new Date() },
        })
        await emit(job.id, job.projectId, "failed", "Research was interrupted. Retry to resume.", "ERROR")
      }
      return { recovered: stale.length }
    })
  },
)
