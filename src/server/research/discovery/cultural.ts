import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { culturalRefListSchema } from "@/lib/schemas/brand"
import { culturalInsightGenerationSchema, domainPlanSchema, type DomainPlan } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import { generateStructured, untrusted } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { qloo } from "@/server/providers/qloo/client"
import { normalizeInsights } from "@/server/providers/qloo/normalize"
import { upsertQlooEntity } from "@/server/providers/qloo/store"
import { ENTITY_TYPE_LABELS, type InsightsParams, type QlooEntityType } from "@/server/providers/qloo/types"
import { resolveAliases } from "../ranking"
import { brandBrief, constraintsBrief, type DiscoveryContext } from "./context"

const PLAN_SYSTEM = `You plan which cultural domains to analyse with Qloo's Taste AI for a commercial expansion study.
Pick the 3-6 entity domains most likely to reveal concrete commercial opportunities (partners, licensing, products, experiences, markets) for this specific brand and its constraints.
Always include urn:entity:brand: brand affinities are where partners and adjacent categories come from.
Prefer fewer, purposeful domains. Do not pick a domain without a clear commercial rationale.`

export type Seeds = {
  entities: { id: string; qlooId: string; name: string }[]
  tags: { qlooId: string; name: string }[]
}

/** Qloo signals Outbranch may legitimately use: the brand entity, confirmed refs, verified tags. */
export async function loadSeeds(ctx: DiscoveryContext): Promise<Seeds> {
  const refQlooIds = culturalRefListSchema
    .catch([])
    .parse(ctx.profile.culturalRefs)
    .filter((r) => !r.removed && r.qlooId)
    .map((r) => r.qlooId!)
  const refEntities = await db.qlooEntity.findMany({ where: { qlooId: { in: refQlooIds } } })
  const entities = [
    ...(ctx.profile.qlooEntity ? [ctx.profile.qlooEntity] : []),
    ...refEntities.filter((e) => e.id !== ctx.profile.qlooEntityId),
  ]
    .slice(0, 8)
    .map((e) => ({ id: e.id, qlooId: e.qlooId, name: e.name }))
  const themes = await db.brandTheme.findMany({
    where: { projectId: ctx.profile.projectId, resolution: "RESOLVED" },
    include: { tag: true },
  })
  const tags = themes.flatMap((t) => (t.tag ? [{ qlooId: t.tag.qlooId, name: t.tag.name }] : [])).slice(0, 5)
  return { entities, tags }
}

export async function planDomains(job: JobContext, ctx: DiscoveryContext): Promise<DomainPlan> {
  await job.stage("plan", "Choosing which cultural domains to analyse")
  const plan = await generateStructured({
    ctx: job.usage("discovery.plan"),
    model: MODELS.fast,
    schema: domainPlanSchema,
    system: PLAN_SYSTEM,
    prompt: [brandBrief(ctx), constraintsBrief(ctx.config)].join("\n\n"),
    effort: "low",
    maxTokens: 3000,
  })
  const domains = [...new Map(plan.domains.map((d) => [d.type, d])).values()]
  if (!domains.some((d) => d.type === "urn:entity:brand")) {
    domains.unshift({ type: "urn:entity:brand", rationale: "Brand affinities reveal partners and adjacent categories." })
  }
  const result = { domains: domains.slice(0, 6) }
  await job.note(
    "plan",
    `Analysing ${result.domains.map((d) => ENTITY_TYPE_LABELS[d.type as QlooEntityType]).join(", ")}`,
    "SUCCESS",
    result as Prisma.InputJsonValue,
  )
  return result
}

const GEO_FILTER_DOMAINS = new Set(["urn:entity:place", "urn:entity:destination"])

/**
 * Query Qloo for every planned domain. The discovery job calls gatherDomain once
 * per domain as separate durable steps; this wrapper serves scripts and tests.
 */
export async function gatherCulturalSignals(job: JobContext, ctx: DiscoveryContext, plan: DomainPlan, seeds: Seeds) {
  let total = 0
  const failures: string[] = []
  for (const domain of plan.domains) {
    const res = await gatherDomain(job, ctx, domain.type, seeds)
    total += res.count
    if (!res.ok) failures.push(domain.type)
  }
  return { total, failures }
}

/**
 * Query Qloo for one domain and persist each result as a cultural relationship
 * with full provenance (query, filters, explainability, time). Never throws for
 * provider errors: a failed domain is reported and the run continues.
 */
export async function gatherDomain(job: JobContext, ctx: DiscoveryContext, domainType: string, seeds: Seeds) {
  const usage = job.usage("discovery.qloo")
  const region = ctx.config.regions[0]
  const byQlooId = new Map(seeds.entities.map((e) => [e.qlooId, e.id]))
  const type = domainType as QlooEntityType
  await job.stage("cultural", `Querying Qloo for ${ENTITY_TYPE_LABELS[type].toLowerCase()}`)
  const params: InsightsParams = {
    "filter.type": type,
    "signal.interests.entities": seeds.entities.map((e) => e.qlooId),
    "signal.interests.tags": seeds.tags.map((t) => t.qlooId),
    "filter.exclude.entities": seeds.entities.map((e) => e.qlooId),
    "feature.explainability": true,
    take: 12,
  }
  // Verified empirically: filter.location.* only applies to places and destinations;
  // other domains are re-weighted geographically through signal.location.query.
  if (region) {
    if (GEO_FILTER_DOMAINS.has(type)) params["filter.location.query"] = region
    else params["signal.location.query"] = region
  }

  try {
    const res = await qloo.insights(usage, params)
    const results = normalizeInsights(res.data.results.entities)
    for (const r of results) {
      const targetId = await upsertQlooEntity(r.entity, res.dataMode)
      const top = [...r.explainability].sort((a, b) => b.score - a.score)[0]
      const data = {
        sourceEntityId: top ? (byQlooId.get(top.entityId) ?? null) : null,
        sourceTagId: null,
        domain: type,
        affinity: r.affinity,
        rank: r.rank,
        explainability: { contributors: r.explainability, audienceGrowth: r.audienceGrowth } as Prisma.InputJsonValue,
        filters: (region ? { region } : {}) as Prisma.InputJsonValue,
        dataMode: res.dataMode,
        retrievedAt: new Date(),
      }
      await db.culturalRelationship.upsert({
        where: {
          projectId_queryId_targetEntityId: { projectId: job.projectId, queryId: res.queryId, targetEntityId: targetId },
        },
        create: { projectId: job.projectId, queryId: res.queryId, targetEntityId: targetId, ...data },
        update: data,
      })
    }
    await job.note(
      "cultural",
      results.length
        ? `${results.length} ${ENTITY_TYPE_LABELS[type].toLowerCase()} with cultural affinity${res.cached ? " (cached)" : ""}`
        : `Qloo returned no ${ENTITY_TYPE_LABELS[type].toLowerCase()} for these signals`,
      results.length ? "INFO" : "WARNING",
    )
    return { ok: true, count: results.length }
  } catch (error) {
    await job.note("cultural", `Qloo query for ${ENTITY_TYPE_LABELS[type]} failed: ${(error as Error).message}`, "WARNING")
    return { ok: false, count: 0 }
  }
}

/** Number the strongest relationships R1..Rn (by rank within their own query). */
export async function relationshipTable(projectId: string, limitPerDomain = 10) {
  const rels = await db.culturalRelationship.findMany({
    where: { projectId, rank: { lte: limitPerDomain } },
    include: { targetEntity: true, sourceEntity: true },
    orderBy: [{ retrievedAt: "desc" }, { domain: "asc" }, { rank: "asc" }],
  })
  // Keep the most recent query per domain+target so refinements use fresh evidence.
  const seen = new Set<string>()
  const latest = rels.filter((r) => {
    const key = `${r.domain}:${r.targetEntityId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const aliases = new Map<string, string>()
  const targets = new Map<string, string>()
  const lines = latest.map((r, i) => {
    const alias = `R${i + 1}`
    aliases.set(alias, r.id)
    targets.set(alias, r.targetEntityId)
    const label = ENTITY_TYPE_LABELS[r.domain as QlooEntityType] ?? r.domain
    return `${alias} ${label}: ${r.targetEntity.name} — rank ${r.rank} in its query${r.sourceEntity ? `, driven mostly by ${r.sourceEntity.name}` : ""}`
  })
  return { aliases, targets, text: lines.join("\n"), count: latest.length }
}

const INSIGHT_SYSTEM = `You interpret Qloo cultural affinity results for a strategy team.
Group related results into 3-6 insights about the audience's tastes. Every insight must cite the R# aliases it is based on.
Affinity ranks are only comparable within the same domain query. Affinity indicates shared taste, not purchase intent or revenue.`

export async function interpretCulture(job: JobContext, ctx: DiscoveryContext) {
  await job.stage("insights", "Interpreting cultural patterns")
  const table = await relationshipTable(job.projectId)
  if (!table.count) return []
  const out = await generateStructured({
    ctx: job.usage("discovery.insights"),
    model: MODELS.research,
    schema: culturalInsightGenerationSchema,
    system: INSIGHT_SYSTEM,
    prompt: [brandBrief(ctx), untrusted("qloo_relationships", table.text)].join("\n\n"),
    effort: "medium",
  })
  await db.culturalInsight.deleteMany({ where: { projectId: job.projectId } })
  const ids: string[] = []
  for (const insight of out.insights.slice(0, 6)) {
    const relIds = resolveAliases(insight.evidence, table.aliases)
    if (!relIds.length) continue // an insight without real Qloo backing is not kept
    const row = await db.culturalInsight.create({
      data: {
        projectId: job.projectId,
        title: insight.title,
        summary: insight.summary,
        domain: insight.domain,
        jobId: job.jobId,
        evidence: { create: relIds.map((relationshipId) => ({ projectId: job.projectId, relationshipId })) },
      },
    })
    ids.push(row.id)
  }
  await job.note("insights", `${ids.length} cultural insights grounded in Qloo evidence`, "SUCCESS")
  return ids
}
