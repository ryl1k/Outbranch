import "server-only"
import {
  commercialFindingsSchema,
  deepDiveSchema,
  evaluationCriteriaSchema,
  partnerListSchema,
} from "@/lib/schemas/discovery"
import { stringListSchema } from "@/lib/schemas/brand"
import { db } from "@/server/db"
import { renderOpportunityReport, renderProjectReport, type ReportInput, type ReportOpportunity } from "./markdown"

async function loadOpportunities(projectId: string, ids?: string[]): Promise<ReportOpportunity[]> {
  const opps = await db.opportunity.findMany({
    where: { projectId, status: "CANDIDATE", ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { rank: "asc" },
    include: {
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      claims: { include: { source: true, evidence: { select: { role: true } } } },
      evidence: { include: { relationship: { include: { targetEntity: true } } } },
    },
  })
  return opps.map((o) => {
    const criteria = evaluationCriteriaSchema.safeParse(o.evaluations[0]?.criteria)
    const commercial = commercialFindingsSchema.omit({ claims: true }).partial().safeParse(o.commercial ?? {})
    const deep = deepDiveSchema.safeParse(o.deepDive)
    return {
      rank: o.rank,
      title: o.title,
      category: o.category,
      summary: o.summary,
      hypothesis: o.hypothesis,
      mechanism: o.mechanism,
      nextAction: o.nextAction,
      evidenceStrength: o.evidenceStrength,
      partners: partnerListSchema.catch([]).parse(o.partners).map((p) => ({ name: p.name, role: p.role })),
      risks: stringListSchema.catch([]).parse(o.risks),
      unknowns: stringListSchema.catch([]).parse(o.unknowns),
      qlooEvidence: o.evidence.flatMap((e) =>
        e.relationship ? [{ entity: e.relationship.targetEntity.name, domain: e.relationship.domain, rank: e.relationship.rank }] : [],
      ),
      criteria: criteria.success ? criteria.data : null,
      commercial: commercial.success && o.commercialAt ? commercial.data : null,
      deepDive: deep.success ? deep.data : null,
      claims: o.claims.map((c) => ({
        statement: c.statement,
        status: c.status,
        stance: c.evidence[0]?.role,
        source: c.source ? { title: c.source.title, url: c.source.url, publisher: c.source.publisher } : null,
      })),
    }
  })
}

export async function buildReport(projectId: string, opportunityId: string | null) {
  const [project, profile, constraints, insights, lastDiscovery] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId } }),
    db.brandProfile.findUniqueOrThrow({ where: { projectId } }),
    db.analysisConstraints.findFirst({ where: { projectId }, orderBy: { iteration: "desc" } }),
    db.culturalInsight.findMany({ where: { projectId } }),
    db.researchJob.findFirst({
      where: { projectId, kind: "DISCOVERY" },
      orderBy: { createdAt: "desc" },
      include: { events: { where: { level: { in: ["WARNING", "ERROR"] } } } },
    }),
  ])
  const opportunities = await loadOpportunities(projectId, opportunityId ? [opportunityId] : undefined)
  if (!opportunities.length) throw new Error("No opportunities to report on")

  const input: ReportInput = {
    brand: { name: profile.name, summary: profile.summary, industry: profile.industry, positioning: profile.positioning },
    generatedAt: new Date(),
    dataMode: project.dataMode,
    constraints: constraints
      ? { iteration: constraints.iteration, regions: constraints.regions, focus: constraints.focusCategories, excluded: constraints.excludedCategories }
      : null,
    insights: insights.map((i) => ({ title: i.title, summary: i.summary })),
    opportunities,
    limitations: lastDiscovery?.events.map((e) => e.message) ?? [],
  }
  return opportunityId
    ? { title: `Opportunity brief: ${opportunities[0].title}`, markdown: renderOpportunityReport(input) }
    : { title: `${profile.name}: cultural expansion opportunities`, markdown: renderProjectReport(input) }
}
