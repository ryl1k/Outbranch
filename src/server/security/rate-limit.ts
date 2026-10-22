import "server-only"
import { db } from "@/server/db"

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RateLimitError"
  }
}

/**
 * Research jobs are the expensive operation, so the limit is enforced on the
 * persisted job history of the workspace. This holds across serverless instances.
 */
export async function assertJobBudget(workspaceId: string, opts = { perHour: 30, concurrent: 4 }) {
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const [recent, active] = await Promise.all([
    db.researchJob.count({ where: { project: { workspaceId }, createdAt: { gte: since } } }),
    db.researchJob.count({ where: { project: { workspaceId }, status: { in: ["QUEUED", "RUNNING"] } } }),
  ])
  if (recent >= opts.perHour) {
    throw new RateLimitError("Hourly research limit reached for this workspace. Please try again later.")
  }
  if (active >= opts.concurrent) {
    throw new RateLimitError("Too many research jobs are running. Wait for one to finish.")
  }
}

/** Limits project creation per workspace (guests create workspaces freely). */
export async function assertProjectBudget(workspaceId: string, perDay = 25) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await db.project.count({ where: { workspaceId, createdAt: { gte: since } } })
  if (count >= perDay) throw new RateLimitError("Daily project limit reached for this workspace.")
}
