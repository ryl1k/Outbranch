import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { commercialFindingsSchema, partnerListSchema, type CommercialFindings } from "@/lib/schemas/discovery"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import { generateStructured, untrusted, webResearch, type WebSource } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { classifyClaim } from "../evidence"

const RESEARCH_SYSTEM = `You are a commercial analyst testing an expansion hypothesis with public evidence.
Investigate: existing competitors in the target space, potential partners and their current deals, comparable launches or collaborations that already happened, market conditions and size indicators, cost drivers, licensing or IP requirements, dependencies and major uncertainties.
Look for evidence that contradicts the hypothesis as well as evidence that supports it. Be specific and cite sources.`

const EXTRACT_SYSTEM = `You convert commercial research notes into structured findings.
Use only information in the notes and sources. Mark claims VERIFIED only with a valid sourceIndex.
Mark each claim's stance: SUPPORTS or CONTRADICTS the hypothesis, or CONTEXT. Do not invent figures; write "not established" when unknown.`

export type CommercialResearch = {
  findings: CommercialFindings
  sources: WebSource[]
}

/** Expensive half: web research and extraction. Returned data is persisted by a separate step. */
export async function researchOpportunity(
  job: JobContext,
  opportunityId: string,
  brandName: string,
): Promise<CommercialResearch> {
  const opp = await db.opportunity.findUniqueOrThrow({ where: { id: opportunityId } })
  const partners = partnerListSchema.catch([]).parse(opp.partners)
  await job.note("commercial", `Investigating “${opp.title}”`)

  const subject = [
    `Brand: ${brandName}`,
    `Opportunity: ${opp.title}`,
    `Hypothesis: ${opp.hypothesis}`,
    `Mechanism: ${opp.mechanism}`,
    partners.length ? `Proposed partners: ${partners.map((p) => p.name).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const research = await webResearch({
    ctx: job.usage("commercial.web"),
    model: MODELS.research,
    system: RESEARCH_SYSTEM,
    prompt: untrusted("hypothesis", subject),
    maxSearches: 4,
    maxFetches: 2,
    effort: "medium",
  })

  const findings = await generateStructured({
    ctx: job.usage("commercial.extract"),
    model: MODELS.research,
    schema: commercialFindingsSchema,
    system: EXTRACT_SYSTEM,
    prompt: [
      untrusted("hypothesis", subject),
      untrusted("research_notes", research.notes),
      untrusted("sources", research.sources.map((s, i) => `[${i}] ${s.title} — ${s.url}`).join("\n") || "(none)"),
    ].join("\n\n"),
    effort: "medium",
  })
  return { findings, sources: research.sources.slice(0, 30) }
}

/** Cheap half: idempotently persist findings, sources and stance-tagged claims. */
export async function persistCommercialResearch(job: JobContext, opportunityId: string, data: CommercialResearch) {
  const { findings, sources } = data
  await db.$transaction(async (tx) => {
    const sourceIds: string[] = []
    for (const s of sources) {
      const row = await tx.researchSource.upsert({
        where: { projectId_url: { projectId: job.projectId, url: s.url } },
        create: {
          projectId: job.projectId,
          kind: "WEB",
          url: s.url,
          title: s.title.slice(0, 300),
          excerpt: s.citedText?.slice(0, 400),
          publisher: safeHost(s.url),
        },
        update: { retrievedAt: new Date() },
      })
      sourceIds.push(row.id)
    }
    await tx.claim.deleteMany({ where: { opportunityId } })
    for (const c of findings.claims.slice(0, 20)) {
      const { status, sourceIndex } = classifyClaim(c.status, c.sourceIndex, sourceIds.length)
      const sourceId = sourceIndex === null ? null : sourceIds[sourceIndex]
      await tx.claim.create({
        data: {
          projectId: job.projectId,
          opportunityId,
          topic: "commercial",
          statement: c.statement.slice(0, 600),
          status,
          sourceId,
          evidence: { create: { projectId: job.projectId, opportunityId, sourceId, role: c.stance } },
        },
      })
    }
    const summary = { ...findings, claims: undefined } // claims are stored as rows
    await tx.opportunity.update({
      where: { id: opportunityId },
      data: { commercial: summary as Prisma.InputJsonValue, commercialAt: new Date() },
    })
  })
  return { claims: findings.claims.length, sources: sources.length }
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}
