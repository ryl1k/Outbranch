import "dotenv/config"
import { qloo } from "@/server/providers/qloo/client"
import { normalizeInsights, normalizeEntity, pickBestMatch } from "@/server/providers/qloo/normalize"

async function main() {
  const ctx = { operation: "smoke.qloo" }
  const s = await qloo.searchEntities(ctx, "Liquid Death", { types: ["urn:entity:brand"] })
  const match = pickBestMatch("Liquid Death", s.data.results.map(normalizeEntity))
  console.log("match:", match?.name, match?.qlooId, "cached:", s.cached)
  if (!match) return
  const ins = await qloo.insights(ctx, {
    "filter.type": "urn:entity:artist",
    "signal.interests.entities": [match.qlooId],
    "feature.explainability": true,
    take: 5,
  })
  console.log(normalizeInsights(ins.data.results.entities).map((i) => `${i.rank}. ${i.entity.name} (${i.affinity?.toFixed(3)})`))
  const again = await qloo.searchEntities(ctx, "Liquid Death", { types: ["urn:entity:brand"] })
  console.log("second call cached:", again.cached, "queryId stable:", again.queryId === s.queryId)
}
main().catch((e) => { console.error(e); process.exit(1) })
