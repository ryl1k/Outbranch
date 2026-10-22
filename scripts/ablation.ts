/**
 * Qloo ablation: LLM-only vs Qloo-enhanced opportunity generation on the same
 * confirmed brand profile. Requires a project that has completed discovery.
 *
 * Usage: npx tsx --conditions=react-server scripts/ablation.ts <projectId>
 *
 * Aggregate metrics are appended to docs/evaluation/ablation.md. Per-opportunity
 * detail (which contains Qloo entity names) goes to eval-output/, which is not
 * committed: Qloo response data must not be published in a public repository.
 */
import "dotenv/config"
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { runAblation } from "@/server/evaluation/ablation"

const fmtPct = (n: number) => `${Math.round(n * 100)}%`

async function main() {
  const projectId = process.argv[2]
  if (!projectId) throw new Error("Usage: scripts/ablation.ts <projectId>")
  const r = await runAblation(projectId)

  mkdirSync("eval-output", { recursive: true })
  const slug = r.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  writeFileSync(`eval-output/ablation-${slug}-${r.generatedAt.slice(0, 10)}.json`, JSON.stringify(r, null, 2))

  const { qloo, llmOnly } = r.arms
  const row = (label: string, a: string | number, b: string | number) => `| ${label} | ${a} | ${b} |`
  const md = [
    `\n## ${r.brand} — ${r.generatedAt.slice(0, 10)}`,
    "",
    `Generation model: \`${r.model}\`. Qloo affinities available for verification: ${r.qlooAffinitiesAvailable}.`,
    "",
    "| Metric (measured) | Qloo-enhanced | LLM-only |",
    "|---|---|---|",
    row("Opportunities generated", qloo.opportunities, llmOnly.opportunities),
    row("Named entities proposed", qloo.namedEntities, llmOnly.namedEntities),
    row("Entities verified as Qloo audience affinities", `${qloo.qlooVerifiedEntities} (${fmtPct(qloo.qlooVerifiedRate)})`, `${llmOnly.qlooVerifiedEntities} (${fmtPct(llmOnly.qlooVerifiedRate)})`),
    row("Opportunities with ≥1 verified cultural link", qloo.opportunitiesWithVerifiedLink, llmOnly.opportunitiesWithVerifiedLink),
    row("Entities new to the brand profile", `${qloo.novelEntities} (${fmtPct(qloo.noveltyRate)})`, `${llmOnly.novelEntities} (${fmtPct(llmOnly.noveltyRate)})`),
    row("Distinct verified cultural domains", qloo.verifiedDomains, llmOnly.verifiedDomains),
    "",
    "| Blind review (model judgement, 1–5) | Qloo-enhanced | LLM-only |",
    "|---|---|---|",
    ...Object.keys(r.judge.scores.qloo).map((k) => row(k, r.judge.scores.qloo[k], r.judge.scores.llmOnly[k])),
    "",
    `Reviewer preference: **${r.judge.preferred === "qloo" ? "Qloo-enhanced" : r.judge.preferred === "llmOnly" ? "LLM-only" : "tie"}**. ${r.judge.note}`,
    "",
  ].join("\n")

  const file = "docs/evaluation/ablation.md"
  if (!existsSync(file)) {
    mkdirSync("docs/evaluation", { recursive: true })
    writeFileSync(
      file,
      `# Qloo ablation\n\nReproducible comparison of LLM-only and Qloo-enhanced opportunity generation on the same confirmed brand profile, claims and constraints. Run with \`scripts/ablation.ts\`; see the script header for method and data-handling notes.\n\n**Method.** Both arms use the same model, prompt and brand evidence; the only difference is whether Qloo relationships and cultural insights are included. Named entities are extracted from every opportunity with the same extractor. An entity is *verified* when its normalized name appears among the Qloo affinity results collected for the brand (conservative: spelling variants count as unverified). *Novel* means absent from the confirmed brand profile. The blind review is a model judgement and is reported separately from measured metrics.\n`,
    )
  }
  appendFileSync(file, md)
  console.log(md)
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
