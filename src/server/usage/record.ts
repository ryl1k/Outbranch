import "server-only"
import type { Provider } from "@/generated/prisma/client"
import { db } from "@/server/db"

export type UsageContext = {
  projectId?: string | null
  jobId?: string | null
  operation: string
}

export async function recordUsage(
  ctx: UsageContext,
  entry: {
    provider: Provider
    model?: string
    inputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    webSearches?: number
    costUsd?: number | null
    durationMs: number
    cacheHit?: boolean
    retries?: number
    ok: boolean
  },
) {
  try {
    await db.usageRecord.create({
      data: {
        projectId: ctx.projectId ?? null,
        jobId: ctx.jobId ?? null,
        operation: ctx.operation,
        ...entry,
      },
    })
  } catch (error) {
    // Usage tracking must never break research.
    console.error("[usage] failed to record", ctx.operation, error)
  }
}
