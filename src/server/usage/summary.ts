import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/server/db"

/** Aggregated provider usage for a project or a whole workspace. */
export async function usageSummary(where: Prisma.UsageRecordWhereInput) {
  const rows = await db.usageRecord.groupBy({
    by: ["provider", "model"],
    where,
    _count: { _all: true },
    _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true, webSearches: true, costUsd: true, durationMs: true, retries: true },
  })
  const [cacheHits, failures] = await Promise.all([
    db.usageRecord.count({ where: { ...where, cacheHit: true } }),
    db.usageRecord.count({ where: { ...where, ok: false } }),
  ])
  const totals = rows.reduce(
    (t, r) => ({
      calls: t.calls + r._count._all,
      costUsd: t.costUsd + (r._sum.costUsd ?? 0),
      webSearches: t.webSearches + (r._sum.webSearches ?? 0),
      inputTokens: t.inputTokens + (r._sum.inputTokens ?? 0),
      outputTokens: t.outputTokens + (r._sum.outputTokens ?? 0),
    }),
    { calls: 0, costUsd: 0, webSearches: 0, inputTokens: 0, outputTokens: 0 },
  )
  return { rows, totals, cacheHits, failures }
}

export type UsageSummary = Awaited<ReturnType<typeof usageSummary>>
