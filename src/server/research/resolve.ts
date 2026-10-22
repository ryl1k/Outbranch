import "server-only"
import { resolutionSchema, type Resolution } from "@/lib/schemas/brand"
import { classifyIdentifier, userContextSchema } from "@/lib/schemas/project"
import { db } from "@/server/db"
import type { JobContext } from "@/server/jobs/lifecycle"
import { generateStructured, untrusted, webResearch } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"
import { ProviderResponseError } from "@/server/providers/errors"
import { checkPublicUrl } from "@/server/security/url"

const RESOLVE_SYSTEM = `You identify which real-world brand, company, product or entertainment property a user means.
Search the web to find the distinct real entities that match the identifier. Report what you find factually and briefly.
Look specifically for: different organisations sharing the name, parent companies that own several brands, and whether the identifier is a sub-brand or a whole company.`

const DECIDE_SYSTEM = `You convert research notes into a structured entity-resolution decision.
- List each distinct real entity that plausibly matches, best match first (max 5).
- Mark ambiguous=true only when a reasonable user could mean more than one of them.
- If the identifier is a parent company that owns several notable brands, include the company AND its most relevant brands as candidates and mark ambiguous=true so the user can choose the scope.
- Mark notFound=true only when the notes show no real entity matches. Never invent entities.`

export async function resolveEntity(job: JobContext): Promise<Resolution> {
  const project = await db.project.findUniqueOrThrow({ where: { id: job.projectId } })
  const context = userContextSchema.safeParse(project.userContext ?? {})
  const kind = classifyIdentifier(project.identifier)

  let identifierText = project.identifier
  if (kind === "url") {
    const check = checkPublicUrl(project.identifier)
    if (!check.ok) throw new ProviderResponseError("anthropic", `Website rejected: ${check.reason}`)
    identifierText = check.url.toString()
  }

  await job.stage("resolve.search", "Searching the web for matching entities")
  const research = await webResearch({
    ctx: job.usage("resolve.search"),
    model: MODELS.research,
    system: RESOLVE_SYSTEM,
    prompt: [
      `Identifier type: ${kind}`,
      untrusted("identifier", identifierText),
      context.success && context.data.industry ? untrusted("user_industry_hint", context.data.industry) : "",
      kind === "url" ? "Fetch the website to learn which entity it belongs to." : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxSearches: 3,
    maxFetches: kind === "url" ? 1 : 0,
    effort: "low",
  })

  await job.stage("resolve.decide", "Checking for ambiguity")
  const decision = await generateStructured({
    ctx: job.usage("resolve.decide"),
    model: MODELS.fast,
    schema: resolutionSchema,
    system: DECIDE_SYSTEM,
    prompt: [
      untrusted("identifier", identifierText),
      untrusted("research_notes", research.notes || "(no notes)"),
      untrusted("sources", research.sources.map((s) => `- ${s.title} — ${s.url}`).join("\n") || "(none)"),
    ].join("\n\n"),
    effort: "low",
    maxTokens: 4000,
  })

  return { ...decision, candidates: decision.candidates.slice(0, 5) }
}
