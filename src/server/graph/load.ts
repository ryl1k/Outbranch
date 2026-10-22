import "server-only"
import { culturalRefListSchema } from "@/lib/schemas/brand"
import { partnerListSchema } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import { buildCulturalGraph } from "./build"

/** Load persisted research for a project and build its cultural network. */
export async function loadCulturalGraph(projectId: string) {
  const [profile, relationships, opportunities] = await Promise.all([
    db.brandProfile.findUnique({ where: { projectId }, include: { qlooEntity: true } }),
    db.culturalRelationship.findMany({
      where: { projectId },
      include: { targetEntity: true, sourceEntity: true },
      orderBy: { retrievedAt: "desc" },
    }),
    db.opportunity.findMany({
      where: { projectId, status: "CANDIDATE" },
      include: { evidence: { where: { relationshipId: { not: null } }, select: { relationshipId: true } } },
      orderBy: { rank: "asc" },
    }),
  ])
  if (!profile) return { nodes: [], edges: [] }

  const refs = culturalRefListSchema.catch([]).parse(profile.culturalRefs).filter((r) => !r.removed && r.qlooId)
  const seen = new Set<string>()
  return buildCulturalGraph({
    defaultPerDomain: 2,
    brand: { id: profile.id, name: profile.name, qlooEntityId: profile.qlooEntity?.qlooId ?? null, imageUrl: profile.qlooEntity?.imageUrl },
    references: refs.map((r) => ({ qlooEntityId: r.qlooId!, name: r.resolvedName ?? r.name, type: r.type })),
    // Most recent result per domain + target keeps the network current after refinements.
    relationships: relationships
      .filter((r) => {
        const key = `${r.domain}:${r.targetEntityId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r) => {
        const ex = r.explainability as { contributors?: { score: number }[] } | null
        return {
          id: r.id,
          domain: r.domain,
          rank: r.rank,
          targetEntityId: r.targetEntity.qlooId,
          targetName: r.targetEntity.name,
          targetImage: r.targetEntity.imageUrl,
          sourceEntityId: r.sourceEntity?.qlooId ?? null,
          topScore: ex?.contributors?.length ? Math.max(...ex.contributors.map((c) => c.score)) : null,
          retrievedAt: r.retrievedAt.toISOString(),
          dataMode: r.dataMode,
        }
      }),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      category: o.category,
      rank: o.rank,
      evidenceStrength: o.evidenceStrength,
      relationshipIds: o.evidence.flatMap((e) => (e.relationshipId ? [e.relationshipId] : [])),
      partners: partnerListSchema
        .catch([])
        .parse(o.partners)
        .map((p) => ({ name: p.name, qlooEntityId: p.qlooEntityId ? relationships.find((r) => r.targetEntityId === p.qlooEntityId)?.targetEntity.qlooId : null })),
    })),
  })
}
