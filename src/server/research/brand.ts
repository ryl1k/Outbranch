import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import {
  brandProfileExtractionSchema,
  culturalRefListSchema,
  type BrandProfileExtraction,
  type CulturalRef,
} from "@/lib/schemas/brand"
import { userContextSchema, type UserContext } from "@/lib/schemas/project"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import { generateStructured, untrusted, webResearch, type WebSource } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { qloo } from "@/server/providers/qloo/client"
import { normalizeEntity, pickBestMatch } from "@/server/providers/qloo/normalize"
import { upsertQlooEntity, upsertQlooTag } from "@/server/providers/qloo/store"
import { classifyClaim } from "./evidence"
import { matchTag } from "./tags"

const RESEARCH_SYSTEM = `You are a brand strategy researcher preparing a factual brand profile.
Research the entity using official sources first (official site, investor or press pages), then reputable press.
Cover: identity and ownership, products and services, entertainment properties, cultural positioning, notable collaborations and partnerships (with years), markets, audiences, competitors, and strategic context.
Be factual and specific. Prefer recent information. Say clearly when something could not be confirmed.`

const EXTRACT_SYSTEM = `You turn research notes into a structured brand profile.
Rules:
- Use only information present in the notes, sources or the user's context. Do not add outside facts.
- Each claim must be a single statement. Use status VERIFIED only when the numbered source directly supports it and give its sourceIndex.
- Use INFERRED for reasonable conclusions without a direct source, UNCERTAIN where sources conflict or are thin.
- culturalRefs must be real, named entities (brands, artists, shows, games, books, places, people) with a documented link to the brand; never invent associations.
- themes are short natural-language cultural themes (2-4 words each), 4-8 of them.`

function userContextBlock(context: UserContext) {
  const lines = Object.entries(context)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
  return lines.length ? untrusted("user_context", lines.join("\n")) : ""
}

async function loadInputs(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { candidates: { where: { selected: true }, take: 1 } },
  })
  const context = userContextSchema.safeParse(project.userContext ?? {})
  return { project, candidate: project.candidates[0] ?? null, context: context.success ? context.data : {} }
}

export async function researchBrandWeb(job: JobContext): Promise<{ notes: string; sources: WebSource[] }> {
  const { project, candidate, context } = await loadInputs(job.projectId)
  const subject = candidate
    ? `${candidate.name} (${candidate.kind}${candidate.parentName ? `, owned by ${candidate.parentName}` : ""}) — ${candidate.description}${candidate.url ? ` — ${candidate.url}` : ""}`
    : project.identifier

  await job.stage("brand.web", `Researching ${candidate?.name ?? project.name} across public sources`)
  return webResearch({
    ctx: job.usage("brand.web"),
    model: MODELS.research,
    system: RESEARCH_SYSTEM,
    prompt: [untrusted("subject", subject), userContextBlock(context)].filter(Boolean).join("\n\n"),
    maxSearches: 6,
    maxFetches: 3,
    effort: "medium",
  })
}

export async function extractBrandProfile(
  job: JobContext,
  research: { notes: string; sources: WebSource[] },
): Promise<BrandProfileExtraction> {
  const { project, candidate, context } = await loadInputs(job.projectId)
  await job.stage("brand.extract", "Structuring the brand profile and classifying evidence")
  const sourceList = research.sources
    .map((s, i) => `[${i}] ${s.title} — ${s.url}${s.citedText ? `\n    excerpt: ${s.citedText}` : ""}`)
    .join("\n")

  return generateStructured({
    ctx: job.usage("brand.extract"),
    model: MODELS.research,
    schema: brandProfileExtractionSchema,
    system: EXTRACT_SYSTEM,
    prompt: [
      `Subject: ${candidate?.name ?? project.identifier}`,
      untrusted("research_notes", research.notes),
      untrusted("sources", sourceList || "(none)"),
      userContextBlock(context),
    ]
      .filter(Boolean)
      .join("\n\n"),
    effort: "medium",
  })
}

/** Persist the profile, its sources and classified claims. Replaces the previous draft. */
export async function persistBrandProfile(
  job: JobContext,
  extraction: BrandProfileExtraction,
  sources: WebSource[],
) {
  const { project, context } = await loadInputs(job.projectId)
  await job.stage("brand.persist", `Saving ${sources.length} sources and ${extraction.claims.length} claims`)

  await db.$transaction(async (tx) => {
    // A re-run replaces brand-level research but never touches opportunity evidence.
    await tx.claim.deleteMany({ where: { projectId: project.id, opportunityId: null } })
    await tx.brandTheme.deleteMany({ where: { projectId: project.id } })

    const sourceIds: string[] = []
    for (const s of sources) {
      const row = await tx.researchSource.upsert({
        where: { projectId_url: { projectId: project.id, url: s.url } },
        create: {
          projectId: project.id,
          kind: "WEB",
          url: s.url,
          title: s.title.slice(0, 300),
          excerpt: s.citedText?.slice(0, 400),
          publisher: hostOf(s.url),
        },
        update: { title: s.title.slice(0, 300), retrievedAt: new Date() },
      })
      sourceIds.push(row.id)
    }

    const claims: Prisma.ClaimCreateManyInput[] = extraction.claims.map((c) => {
      const { status, sourceIndex } = classifyClaim(c.status, c.sourceIndex, sourceIds.length)
      return {
        projectId: project.id,
        topic: c.topic,
        statement: c.statement.slice(0, 600),
        status,
        sourceId: sourceIndex === null ? null : sourceIds[sourceIndex],
      }
    })
    for (const [key, value] of Object.entries(context)) {
      if (value) claims.push({ projectId: project.id, topic: `user:${key}`, statement: String(value), status: "USER_PROVIDED" })
    }
    await tx.claim.createMany({ data: claims })

    const data = {
      status: "DRAFT" as const,
      name: extraction.name,
      entityKind: extraction.entityKind,
      officialUrl: extraction.officialUrl,
      summary: extraction.summary,
      industry: extraction.industry ?? context.industry ?? null,
      positioning: extraction.positioning,
      products: extraction.products.slice(0, 20),
      audiences: extraction.audiences.slice(0, 12),
      markets: extraction.markets.slice(0, 20),
      competitors: extraction.competitors.slice(0, 15),
      collaborations: extraction.collaborations.slice(0, 15),
      culturalRefs: extraction.culturalRefs.slice(0, 15).map((r) => ({ ...r, qlooId: null, resolvedName: null })),
      confirmedAt: null,
    }
    await tx.brandProfile.upsert({
      where: { projectId: project.id },
      create: { projectId: project.id, ...data },
      update: { ...data, version: { increment: 1 } },
    })
    await tx.brandTheme.createMany({
      data: [...new Set(extraction.themes.map((t) => t.trim().toLowerCase()))]
        .slice(0, 10)
        .map((label) => ({ projectId: project.id, label })),
      skipDuplicates: true,
    })
  })
}

const KIND_TO_QLOO_TYPES: Record<string, string[]> = {
  brand: ["urn:entity:brand"],
  company: ["urn:entity:brand"],
  product: ["urn:entity:brand"],
  entertainment_ip: ["urn:entity:tv_show", "urn:entity:movie", "urn:entity:videogame", "urn:entity:book"],
  person: ["urn:entity:person", "urn:entity:artist"],
  other: [],
}

/**
 * Resolve the brand itself, its cultural references and its themes against
 * Qloo. Unresolved items are kept and labeled, never replaced with guesses.
 */
export async function resolveBrandInQloo(job: JobContext) {
  const profile = await db.brandProfile.findUniqueOrThrow({ where: { projectId: job.projectId } })
  const ctx = job.usage("qloo.resolve")
  let resolvedEntity = false

  await job.stage("qloo.entity", `Looking up ${profile.name} in Qloo`)
  for (const type of KIND_TO_QLOO_TYPES[profile.entityKind] ?? []) {
    const res = await qloo.searchEntities(ctx, profile.name, { types: [type], take: 5 })
    const match = pickBestMatch(profile.name, res.data.results.map(normalizeEntity))
    if (match) {
      const id = await upsertQlooEntity(match, res.dataMode)
      await db.brandProfile.update({ where: { id: profile.id }, data: { qlooEntityId: id } })
      await job.note("qloo.entity", `Matched Qloo entity “${match.name}”`, "SUCCESS")
      resolvedEntity = true
      break
    }
  }
  if (!resolvedEntity) {
    await job.note(
      "qloo.entity",
      `${profile.name} is not in Qloo's catalogue; cultural analysis will use its resolved references instead`,
      "WARNING",
    )
  }

  await job.stage("qloo.references", "Resolving cultural references in Qloo")
  const refs = culturalRefListSchema.parse(profile.culturalRefs)
  const resolvedRefs: CulturalRef[] = []
  for (const ref of refs) {
    const res = await qloo.searchEntities(ctx, ref.name, { types: [`urn:entity:${ref.type}`], take: 5 })
    const match = pickBestMatch(ref.name, res.data.results.map(normalizeEntity))
    if (match) await upsertQlooEntity(match, res.dataMode)
    resolvedRefs.push({ ...ref, qlooId: match?.qlooId ?? null, resolvedName: match?.name ?? null })
  }
  await db.brandProfile.update({ where: { id: profile.id }, data: { culturalRefs: resolvedRefs } })
  const refHits = resolvedRefs.filter((r) => r.qlooId).length
  await job.note("qloo.references", `${refHits} of ${refs.length} cultural references resolved to Qloo entities`)

  await job.stage("qloo.tags", "Matching brand themes to Qloo tags")
  const themes = await db.brandTheme.findMany({ where: { projectId: job.projectId } })
  let tagHits = 0
  for (const theme of themes) {
    const res = await qloo.searchTags(ctx, theme.label, { take: 10 })
    const tag = matchTag(theme.label, res.data.results.tags)
    if (tag) {
      const tagId = await upsertQlooTag(tag, res.dataMode)
      await db.brandTheme.update({ where: { id: theme.id }, data: { resolution: "RESOLVED", tagId } })
      tagHits++
    } else {
      await db.brandTheme.update({ where: { id: theme.id }, data: { resolution: "NO_MATCH" } })
    }
  }
  await job.note("qloo.tags", `${tagHits} of ${themes.length} themes matched verified Qloo tags`)

  return { resolvedEntity, refHits, tagHits }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}
