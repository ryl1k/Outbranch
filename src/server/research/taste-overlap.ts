import "server-only"
import { qloo } from "@/server/providers/qloo/client"

export type TasteOverlap =
  | { status: "ok"; tags: { name: string; score: number | null }[] }
  | { status: "unavailable"; reason: string }

/**
 * Shared taste between the Qloo evidence behind two opportunities, using the
 * documented /v2/analysis/compare endpoint. Scores are only meaningful within
 * this comparison.
 */
export async function tasteOverlap(projectId: string, a: string[], b: string[]): Promise<TasteOverlap> {
  if (!a.length || !b.length) return { status: "unavailable", reason: "One of the opportunities has no Qloo entities to compare." }
  try {
    const res = await qloo.compare({ projectId, operation: "compare.taste-overlap" }, a.slice(0, 5), b.slice(0, 5))
    const tags = res.data.results.tags
      .map((t) => ({ name: t.name, score: typeof t.query?.score === "number" ? t.query.score : null }))
      .slice(0, 10)
    return tags.length ? { status: "ok", tags } : { status: "unavailable", reason: "Qloo reported no shared taste tags." }
  } catch (error) {
    return { status: "unavailable", reason: `Qloo comparison failed: ${(error as Error).message}` }
  }
}
