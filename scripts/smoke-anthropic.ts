import "dotenv/config"
import { z } from "zod"
import { generateStructured, webResearch } from "@/server/providers/anthropic/client"
import { MODELS } from "@/server/providers/anthropic/models"

async function main() {
  const out = await generateStructured({
    ctx: { operation: "smoke.structured" },
    model: MODELS.fast,
    schema: z.object({ kind: z.enum(["brand", "company", "product", "entertainment_ip"]), name: z.string() }),
    system: "Classify the identifier.",
    prompt: "Identifier: Stranger Things",
    effort: "low",
  })
  console.log("structured:", out)
  const r = await webResearch({
    ctx: { operation: "smoke.web" },
    model: MODELS.research,
    system: "You are a concise research assistant.",
    prompt: "In 3 bullet points: what is Liquid Death (the beverage brand) and who owns it? Cite sources.",
    maxSearches: 2,
    maxFetches: 0,
    effort: "low",
  })
  console.log("notes:", r.notes.slice(0, 500))
  console.log("sources:", r.sources.slice(0, 5))
}
main().catch((e) => { console.error(e); process.exit(1) })
