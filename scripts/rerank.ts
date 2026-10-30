/** Maintenance: recompute evidence strength and ranking for a project. Usage: tsx scripts/rerank.ts <projectId> */
import "dotenv/config"
import { rerank } from "@/server/research/discovery/evaluate"

rerank(process.argv[2]).then(() => console.log("reranked"), (e) => { console.error(e); process.exit(1) })
