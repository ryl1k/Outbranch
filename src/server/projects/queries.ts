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
