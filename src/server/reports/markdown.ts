/**
 * Deterministic report rendering. Reports only restate persisted research, so
 * they cannot introduce claims the research does not contain.
 */

export type ReportClaim = { statement: string; status: string; source?: { title: string; url: string | null; publisher: string | null } | null; stance?: string }

export type ReportOpportunity = {
  rank: number | null
  title: string
  category: string
  summary: string
  hypothesis: string
  mechanism: string
  nextAction: string
  evidenceStrength: string
  partners: { name: string; role: string }[]
  risks: string[]
  unknowns: string[]
  qlooEvidence: { entity: string; domain: string; rank: number }[]
  criteria: Record<string, { level: string; basis: string; rationale: string }> | null
  commercial: {
    competitors?: { name: string; note: string }[]
    marketConditions?: string
    costs?: string
    licensing?: string
    existingExamples?: string[]
  } | null
  deepDive: {
    executiveSummary: string
    validationStrategy: { step: string; successSignal: string; effort: string }[]
    nextSteps: string[]
    financialAssumptions: { assumption: string; basis: string; note: string }[]
  } | null
  claims: ReportClaim[]
}

export type ReportInput = {
  brand: { name: string; summary: string; industry: string | null; positioning: string | null }
  generatedAt: Date
  dataMode: "LIVE" | "FIXTURE"
  constraints: { iteration: number; regions: string[]; focus: string[]; excluded: string[] } | null
  insights: { title: string; summary: string }[]
  opportunities: ReportOpportunity[]
  limitations: string[]
}

const CATEGORY: Record<string, string> = {
  PRODUCT_CATEGORY: "New product category",
  PARTNERSHIP: "Strategic partnership",
  COLLABORATION: "Brand collaboration",
  LICENSING: "Licensing & merchandise",
  AUDIENCE: "New audience",
  GEOGRAPHIC: "Geographic expansion",
  EXPERIENTIAL: "Entertainment & experiences",
  ADJACENT_MARKET: "Adjacent market",
}
const STRENGTH: Record<string, string> = { STRONG: "Strong", MODERATE: "Moderate", LIMITED: "Limited", INSUFFICIENT: "Insufficient" }
const CRITERIA: Record<string, string> = {
  culturalRelevance: "Cultural relevance",
  strategicFit: "Strategic fit",
  businessModelClarity: "Business model clarity",
  commercialPotential: "Commercial potential",
  differentiation: "Competitive differentiation",
  feasibility: "Feasibility",
  risk: "Risk",
  uncertainty: "Uncertainty",
}
const LEVEL: Record<string, string> = { very_low: "Very low", low: "Low", medium: "Medium", high: "High", very_high: "Very high" }
const BASIS: Record<string, string> = { MEASURED: "measured", MODEL_ASSESSED: "model assessment", UNAVAILABLE: "no data" }
const DOMAIN: Record<string, string> = {
  "urn:entity:brand": "Brand",
  "urn:entity:artist": "Artist",
  "urn:entity:movie": "Movie",
  "urn:entity:tv_show": "TV show",
  "urn:entity:videogame": "Video game",
  "urn:entity:book": "Book",
  "urn:entity:podcast": "Podcast",
  "urn:entity:person": "Person",
  "urn:entity:place": "Place",
  "urn:entity:destination": "Destination",
}

/** Escape characters that would break Markdown tables or inline formatting. */
export function md(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim()
}

const list = (items: string[]) => items.map((i) => `- ${md(i)}`).join("\n")
const date = (d: Date) => d.toISOString().slice(0, 10)

function header(input: ReportInput, title: string) {
  return [
    `# ${md(title)}`,
    "",
    `**${md(input.brand.name)}**${input.brand.industry ? ` · ${md(input.brand.industry)}` : ""} · Generated ${date(input.generatedAt)} with Outbranch`,
    "",
    input.dataMode === "FIXTURE"
      ? "> ⚠️ **Simulated data.** Cultural signals in this report come from fixture mode and are not real Qloo research."
      : "> Cultural signals: live Qloo Taste AI queries. Opportunities are AI-generated hypotheses grounded in that evidence; partners are proposals, not existing relationships.",
  ].join("\n")
}

function sourcesSection(claims: ReportClaim[]) {
  const sourced = claims.filter((c) => c.source?.url)
  if (!sourced.length) return "_No external sources were retrieved for this section._"
  const seen = new Map<string, number>()
  const lines: string[] = []
  for (const c of sourced) {
    const url = c.source!.url!
    if (!seen.has(url)) {
      seen.set(url, seen.size + 1)
      lines.push(`${seen.size}. [${md(c.source!.title)}](${url})${c.source!.publisher ? ` — ${md(c.source!.publisher)}` : ""}`)
    }
  }
  return lines.join("\n")
}

export function renderOpportunitySection(o: ReportOpportunity, level = 2): string {
  const h = "#".repeat(level)
  const parts: string[] = [
    `${h} ${o.rank ? `#${o.rank} · ` : ""}${md(o.title)}`,
    "",
    `**${CATEGORY[o.category] ?? o.category}** · Evidence strength: **${STRENGTH[o.evidenceStrength] ?? o.evidenceStrength}** · _AI-generated hypothesis_`,
    "",
    md(o.deepDive?.executiveSummary ?? o.summary),
    "",
    `${h}# Expansion hypothesis`,
    "",
    `> ${md(o.hypothesis)}`,
    "",
    `${h}# Commercial mechanism`,
    "",
    md(o.mechanism),
    "",
    `${h}# Cultural evidence (Qloo)`,
    "",
  ]
  if (o.qlooEvidence.length) {
    parts.push("| Entity | Domain | Rank in query |", "|---|---|---|")
    for (const e of o.qlooEvidence) parts.push(`| ${md(e.entity)} | ${DOMAIN[e.domain] ?? md(e.domain)} | #${e.rank} |`)
    parts.push("", "_Affinity reflects shared taste. It does not predict revenue; ranks are only comparable within the same query._")
  } else {
    parts.push("_No Qloo relationships support this opportunity._")
  }
  parts.push("", `${h}# Potential partners (proposed)`, "", o.partners.length ? list(o.partners.map((p) => `${p.name} — ${p.role}`)) : "_None proposed._")

  parts.push("", `${h}# Market & competition`, "")
  if (o.commercial) {
    if (o.commercial.marketConditions) parts.push(md(o.commercial.marketConditions), "")
    if (o.commercial.competitors?.length) parts.push("**Competitors**", "", list(o.commercial.competitors.map((c) => `${c.name}: ${c.note}`)), "")
    if (o.commercial.existingExamples?.length) parts.push("**Precedents**", "", list(o.commercial.existingExamples), "")
    if (o.commercial.costs) parts.push(`**Costs:** ${md(o.commercial.costs)}`, "")
    if (o.commercial.licensing) parts.push(`**Licensing:** ${md(o.commercial.licensing)}`, "")
  } else {
    parts.push("_Commercial research has not been performed for this opportunity._", "")
  }

  if (o.deepDive?.financialAssumptions.length) {
    parts.push(`${h}# Financial assumptions`, "", "| Assumption | Basis | Note |", "|---|---|---|")
    for (const a of o.deepDive.financialAssumptions) parts.push(`| ${md(a.assumption)} | ${md(a.basis)} | ${md(a.note)} |`)
    parts.push("")
  }

  parts.push(`${h}# Risks & unknowns`, "", o.risks.length ? list(o.risks) : "_None recorded._", "", o.unknowns.length ? `**To validate**\n\n${list(o.unknowns)}` : "", "")

  if (o.criteria) {
    parts.push(`${h}# Outbranch assessment`, "", "| Criterion | Level | Basis | Rationale |", "|---|---|---|---|")
    for (const [key, label] of Object.entries(CRITERIA)) {
      const c = o.criteria[key]
      if (c) parts.push(`| ${label} | ${LEVEL[c.level] ?? c.level} | ${BASIS[c.basis] ?? c.basis} | ${md(c.rationale)} |`)
    }
    parts.push("", "_Levels are model assessments unless marked measured. No success probabilities are stated._", "")
  }

  if (o.deepDive?.validationStrategy.length) {
    parts.push(`${h}# Validation strategy`, "")
    o.deepDive.validationStrategy.forEach((v, i) => parts.push(`${i + 1}. **${md(v.step)}** — success signal: ${md(v.successSignal)} _(effort: ${v.effort})_`))
    parts.push("")
  }
  parts.push(`${h}# Recommended next steps`, "", list(o.deepDive?.nextSteps ?? [o.nextAction]), "")
  parts.push(`${h}# Sources`, "", sourcesSection(o.claims), "")
  return parts.join("\n")
}

export function renderOpportunityReport(input: ReportInput): string {
  const o = input.opportunities[0]
  return [header(input, `Opportunity brief: ${o.title}`), "", renderOpportunitySection(o, 2)].join("\n").trim() + "\n"
}

export function renderProjectReport(input: ReportInput): string {
  const c = input.constraints
  const parts = [
    header(input, `${input.brand.name}: cultural expansion opportunities`),
    "",
    "## Executive overview",
    "",
    md(input.brand.summary),
    "",
    input.brand.positioning ? `**Positioning:** ${md(input.brand.positioning)}\n` : "",
    c
      ? `**Scope (iteration ${c.iteration}):** ${[
          c.focus.length ? `focus on ${c.focus.map((f) => CATEGORY[f] ?? f).join(", ")}` : "all categories",
          c.regions.length ? `regions ${c.regions.join(", ")}` : null,
          c.excluded.length ? `excluding ${c.excluded.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("; ")}`
      : "",
    "",
    "## Ranked opportunities",
    "",
    "| # | Opportunity | Category | Evidence |",
    "|---|---|---|---|",
    ...input.opportunities.map((o) => `| ${o.rank ?? "–"} | ${md(o.title)} | ${CATEGORY[o.category] ?? o.category} | ${STRENGTH[o.evidenceStrength] ?? o.evidenceStrength} |`),
    "",
  ]
  if (input.insights.length) {
    parts.push("## Cultural insights", "")
    for (const i of input.insights) parts.push(`### ${md(i.title)}`, "", md(i.summary), "")
  }
  parts.push("## Opportunity details", "")
  for (const o of input.opportunities) parts.push(renderOpportunitySection(o, 3), "---", "")
  parts.push("## Limitations", "")
  parts.push(
    list([
      "Cultural affinity indicates shared taste. It does not predict revenue, purchase probability or partnership success.",
      "Opportunities are AI-generated hypotheses; proposed partners have not been contacted and no relationship is implied.",
      ...input.limitations,
    ]),
  )
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n"
}
