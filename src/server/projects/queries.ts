import "server-only"
import { culturalRefListSchema, collaborationListSchema, productListSchema, stringListSchema } from "@/lib/schemas/brand"
import type { Viewer } from "@/server/auth/session"
import { assertProjectAccess } from "@/server/auth/session"
import { db } from "@/server/db"

export async function listProjects(viewer: Viewer) {
  return db.project.findMany({
    where: { workspaceId: viewer.workspace.id, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      profile: { select: { name: true, entityKind: true, industry: true, status: true } },
      _count: { select: { opportunities: { where: { status: "CANDIDATE" } } } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, kind: true } },
    },
  })
}

export async function getProjectHeader(projectId: string) {
  const { project } = await assertProjectAccess(projectId)
  const [profile, latestJob] = await Promise.all([
    db.brandProfile.findUnique({ where: { projectId }, include: { qlooEntity: true } }),
    db.researchJob.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } }),
  ])
  return { project, profile, latestJob }
}

export async function getCandidates(projectId: string) {
  return db.brandCandidate.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } })
}

export async function getJobTimeline(projectId: string, jobLimit = 3) {
  const jobs = await db.researchJob.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: jobLimit,
    include: { events: { orderBy: { createdAt: "asc" } } },
  })
  return jobs
}

/** Everything the verification screen needs, with JSON columns parsed. */
export async function getBrandVerification(projectId: string) {
  const profile = await db.brandProfile.findUnique({ where: { projectId }, include: { qlooEntity: true } })
  if (!profile) return null
  const [claims, sources, themes] = await Promise.all([
    db.claim.findMany({
      where: { projectId, opportunityId: null },
      include: { source: true },
      orderBy: [{ topic: "asc" }, { createdAt: "asc" }],
    }),
    db.researchSource.findMany({ where: { projectId, kind: "WEB" }, orderBy: { retrievedAt: "asc" } }),
    db.brandTheme.findMany({ where: { projectId }, include: { tag: true }, orderBy: { label: "asc" } }),
  ])
  return {
    profile,
    products: productListSchema.catch([]).parse(profile.products),
    audiences: stringListSchema.catch([]).parse(profile.audiences),
    markets: stringListSchema.catch([]).parse(profile.markets),
    competitors: stringListSchema.catch([]).parse(profile.competitors),
    collaborations: collaborationListSchema.catch([]).parse(profile.collaborations),
    culturalRefs: culturalRefListSchema.catch([]).parse(profile.culturalRefs),
    claims,
    sources,
    themes,
  }
}

export type BrandVerification = NonNullable<Awaited<ReturnType<typeof getBrandVerification>>>

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export async function getOpportunityPortfolio(projectId: string) {
  const [opportunities, latestConstraints, shortlist, insights, relationshipCount, lastDiscovery] = await Promise.all([
    db.opportunity.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { rank: "asc" }],
      include: {
        evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
        evidence: {
          include: {
            relationship: { include: { targetEntity: true } },
            claim: { select: { status: true } },
          },
        },
        _count: { select: { claims: true } },
      },
    }),
    db.analysisConstraints.findFirst({ where: { projectId }, orderBy: { iteration: "desc" } }),
    db.shortlist.findFirst({ where: { projectId }, include: { items: true } }),
    db.culturalInsight.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    db.culturalRelationship.count({ where: { projectId } }),
    db.researchJob.findFirst({ where: { projectId, kind: "DISCOVERY" }, orderBy: { createdAt: "desc" }, include: { events: { where: { level: { in: ["WARNING", "ERROR"] } } } } }),
  ])
  const shortlisted = new Set(shortlist?.items.map((i) => i.opportunityId) ?? [])
  return {
    opportunities: opportunities.map((o) => ({
      ...o,
      shortlisted: shortlisted.has(o.id),
      qlooEntities: o.evidence.flatMap((e) => (e.relationship ? [e.relationship.targetEntity] : [])),
      qlooEvidenceCount: o.evidence.filter((e) => e.relationshipId || e.insightId).length,
      contradicting: o.evidence.filter((e) => e.role === "CONTRADICTS").length,
    })),
    latestConstraints,
    insights,
    relationshipCount,
    lastDiscovery,
  }
}

export type Portfolio = Awaited<ReturnType<typeof getOpportunityPortfolio>>
export type PortfolioOpportunity = Portfolio["opportunities"][number]

export async function getOpportunityDetail(projectId: string, opportunityId: string) {
  const opp = await db.opportunity.findFirst({
    where: { id: opportunityId, projectId },
    include: {
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      claims: { include: { source: true, evidence: { select: { role: true } } }, orderBy: { status: "asc" } },
      evidence: {
        include: {
          relationship: { include: { targetEntity: true, sourceEntity: true, query: { select: { retrievedAt: true, endpoint: true } } } },
          insight: true,
          claim: { include: { source: true } },
        },
      },
      shortlistItems: { select: { shortlistId: true } },
      constraints: { select: { iteration: true } },
    },
  })
  if (!opp) return null
  const [activeJob, explainEntities] = await Promise.all([
    db.researchJob.findFirst({
      where: { projectId, opportunityId, status: { in: ["QUEUED", "RUNNING"] } },
    }),
    // Map explainability contributor ids (Qloo ids) to names for display.
    db.qlooEntity.findMany({
      where: {
        qlooId: {
          in: opp.evidence.flatMap((e) => {
            const ex = e.relationship?.explainability as { contributors?: { entityId: string }[] } | null
            return ex?.contributors?.map((c) => c.entityId) ?? []
          }),
        },
      },
      select: { qlooId: true, name: true },
    }),
  ])
  return { opp, activeJob, contributorNames: new Map(explainEntities.map((e) => [e.qlooId, e.name])) }
}

export type OpportunityDetail = NonNullable<Awaited<ReturnType<typeof getOpportunityDetail>>>

/** Opportunities to compare: explicit ids, else the shortlist, else the top three. */
export async function getComparison(projectId: string, ids: string[]) {
  let selected = ids.slice(0, 4)
  if (selected.length < 2) {
    const shortlist = await db.shortlistItem.findMany({ where: { shortlist: { projectId } }, select: { opportunityId: true } })
    selected = shortlist.map((s) => s.opportunityId).slice(0, 4)
  }
  if (selected.length < 2) {
    const top = await db.opportunity.findMany({ where: { projectId, status: "CANDIDATE" }, orderBy: { rank: "asc" }, take: 3, select: { id: true } })
    selected = top.map((t) => t.id)
  }
  const opps = await db.opportunity.findMany({
    where: { projectId, id: { in: selected } },
    include: {
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      claims: { select: { status: true, sourceId: true, evidence: { select: { role: true } } } },
      evidence: { include: { relationship: { include: { targetEntity: true } } } },
      constraints: { select: { regions: true } },
    },
  })
  const all = await db.opportunity.findMany({
    where: { projectId, status: "CANDIDATE" },
    orderBy: { rank: "asc" },
    select: { id: true, title: true, rank: true },
  })
  return { opportunities: selected.flatMap((id) => opps.filter((o) => o.id === id)), all }
}
export type Comparison = Awaited<ReturnType<typeof getComparison>>
