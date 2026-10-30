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
/** Qloo entity ids are UUIDs; simulated fixture entities are not, and Qloo rejects them. */
const QLOO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function tasteOverlap(projectId: string, entitiesA: string[], entitiesB: string[]): Promise<TasteOverlap> {
  if (!entitiesA.length || !entitiesB.length) {
    return { status: "unavailable", reason: "One of the opportunities has no Qloo entities to compare." }
  }
  const a = entitiesA.filter((id) => QLOO_ID.test(id))
  const b = entitiesB.filter((id) => QLOO_ID.test(id))
  if (!a.length || !b.length) {
    return { status: "unavailable", reason: "Taste overlap needs live Qloo entities. This comparison uses simulated data." }
  }
  try {
    const res = await qloo.compare({ projectId, operation: "compare.taste-overlap" }, a.slice(0, 5), b.slice(0, 5))
    const tags = res.data.results.tags
      .map((t) => ({ name: t.name, score: typeof t.query?.score === "number" ? t.query.score : null }))
      .slice(0, 10)
    return tags.length ? { status: "ok", tags } : { status: "unavailable", reason: "Qloo reported no shared taste tags." }
  } catch (error) {
    console.error("[taste-overlap]", error)
    return { status: "unavailable", reason: "Qloo could not compare these opportunities right now. Try again later." }
  }
}
