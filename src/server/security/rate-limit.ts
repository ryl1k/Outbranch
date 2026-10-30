import "server-only"
import { db } from "@/server/db"
import { env } from "@/server/env"

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
  await assertGlobalBudget()
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

/**
 * Guest sign-in creates a fresh workspace per visitor, so per-workspace limits do
 * not bound total spend. These limits apply across the whole deployment.
 */
export async function assertGlobalBudget() {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const jobs = await db.researchJob.count({ where: { createdAt: { gte: hourAgo } } })
  if (jobs >= env.GLOBAL_JOBS_PER_HOUR) {
    throw new RateLimitError("The demo is busy right now. Please try again in a little while.")
  }
  if (env.DAILY_SPEND_LIMIT_USD) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const spent = await db.usageRecord.aggregate({ where: { createdAt: { gte: dayAgo } }, _sum: { costUsd: true } })
    if ((spent._sum.costUsd ?? 0) >= env.DAILY_SPEND_LIMIT_USD) {
      throw new RateLimitError("Today's research budget for this demo is used up. Explore the showcase study, or try again tomorrow.")
    }
  }
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_FAILURES = 10

/** False once an address has too many recent failed sign-ins; the attempt is then refused unchecked. */
export async function assertLoginBudget(email: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS)
  const failures = await db.loginFailure.count({ where: { email, createdAt: { gte: since } } })
  return failures < LOGIN_MAX_FAILURES
}

export async function recordLoginFailure(email: string) {
  await db.loginFailure.create({ data: { email } })
  // Old rows only matter inside the window; prune them as we go.
  await db.loginFailure.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - LOGIN_WINDOW_MS) } } })
}
