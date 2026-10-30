<p align="center">
  <img src="docs/assets/thumbnail.png" alt="Outbranch: Where should your brand grow next?" width="760">
</p>

<h1 align="center">outbranch</h1>

<p align="center">
  <strong>An AI research agent that turns Qloo taste data into ranked, evidence-backed growth opportunities.</strong><br>
  Who to partner with, what to launch and where your brand should expand next.
</p>

<p align="center">
  <a href="https://outbranch.vercel.app"><strong>Live demo</strong></a> ·
  <a href="docs/HACKATHON.md">Devpost write-up</a> ·
  <a href="docs/evaluation/ablation.md">Qloo ablation</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a>
</p>

Built for the [Qloo Agentic Hackathon 2026](https://qloo.devpost.com/). Open source under the [MIT licence](LICENSE).

## Try it

1. Open **[outbranch.vercel.app](https://outbranch.vercel.app)** and choose **Continue as guest**. No account needed.
2. Explore the finished showcase study, or start **New research** with any brand, product, IP or website (try *Liquid Death*, *Patagonia* or *aesop.com*).
3. Confirm the brand profile the agent builds, then watch it map the brand's culture with Qloo and return ranked opportunities in about five minutes.

## What it does

Type one identifier. Outbranch runs a full study:

| Stage | What happens | Evidence comes from |
|---|---|---|
| **Identify** | Resolves the entity. Ambiguous names and parent companies ask you to choose a scope. | Claude + web search |
| **Research** | Builds a brand profile where every claim is *Verified* (with source), *Inferred* or *Uncertain*. | Public sources, cited |
| **Verify** | You correct the profile and confirm it. Nothing else runs until you do. | You |
| **Map the culture** | Plans which domains matter, then gathers Qloo affinities with explainability across brands, artists, places, destinations, books, games, TV and film. | Qloo Insights |
| **Hypothesise** | Proposes opportunities that must cite their Qloo relationships and state who pays whom for what. Ideas without Qloo evidence are discarded. | Claude, grounded in Qloo |
| **Investigate** | Researches competitors, costs, licensing, precedent and contradicting evidence for the top ideas. | Public sources, cited |
| **Rank** | Eight explicit criteria, each marked *measured*, *model assessment* or *no data*. Ranking and evidence strength are computed in code. | TypeScript |

Then you work with the result: an opportunity portfolio, an interactive cultural network that traces every idea back to the brand, side-by-side comparison with Qloo taste overlap, strategic deep dives, refinement into new iterations, printable and Markdown reports, and a research log that draws each run as a graph of its AI calls, web searches and Qloo requests.

Outbranch keeps three kinds of knowledge apart everywhere: **Qloo cultural signals**, **sourced market evidence** and **AI-generated hypotheses**. Proposed partners are always labelled as proposals, and no screen shows an invented market size or success probability.

## Does Qloo actually help? We measured it

[`docs/evaluation/ablation.md`](docs/evaluation/ablation.md) gives the same model, prompt and confirmed brand profile to two arms, with and without Qloo relationships.

| Liquid Death, measured | With Qloo | LLM only |
|---|---|---|
| Named entities verified as real audience affinities | **66%** (21 of 32) | 2% (1 of 48) |
| Opportunities with at least one verifiable cultural link | **7 of 7** | 1 of 8 |
| Distinct verified cultural domains | **4** | 1 |

Without Qloo the model still makes confident cultural claims; almost none can be checked. The write-up also explains what the metric does not prove (it measures groundedness, not commercial success). The ablation used Claude Sonnet 5.5; reproduce it with `scripts/ablation.ts`.

## How it works

```mermaid
flowchart LR
  U[Brand, IP or URL] --> R[Resolve<br/>Claude + web search]
  R --> B[Brand research<br/>sourced claims]
  B --> V{You verify}
  V --> Q[Qloo /search + /v2/tags<br/>entities and themes]
  Q --> I[Qloo /v2/insights<br/>affinities with explainability]
  I --> H[Hypotheses<br/>must cite Qloo evidence]
  H --> C[Commercial research<br/>web search + fetch]
  C --> E[Deterministic ranking<br/>8 criteria]
  E --> X[Portfolio · Network · Compare<br/>Deep dives · Reports]
```

- **Durable agent workflows.** Research runs as [Inngest](https://www.inngest.com) functions: every step is memoised, retried, cancellable and resumable, with workspace and global concurrency limits. Progress streams to the browser over Server-Sent Events.
- **Claude as the researcher.** Anthropic Claude Haiku 5.5 with server-side web search and fetch. Structured outputs are validated with zod, and unsupported "verified" claims are downgraded on the server.
- **Qloo as ground truth for taste.** `/search`, `/v2/tags`, `/v2/insights` (with `feature.explainability`) and `/v2/analysis/compare`. Every relationship stores the query that produced it, so each edge in the network can be traced to its source.

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack

Next.js 16 (App Router, Server Actions, TypeScript strict) · Tailwind CSS 4 + shadcn/ui · PostgreSQL (Neon) + Prisma 7 ·
Auth.js (guest, email and GitHub) · Inngest · Anthropic Claude Haiku 5.5 with web search · Qloo Insights API ·
React Flow · RevenueCat · Vercel · Vitest + Playwright · GitHub Actions.

## Run it locally

Requirements: Node 22+, Docker.

```bash
cp .env.example .env              # add ANTHROPIC_API_KEY and QLOO_API_KEY; set AUTH_SECRET (npx auth secret)
docker compose up -d db           # Postgres on localhost:5442
npm install
npx prisma migrate deploy
npm run db:seed                   # optional: a clearly simulated showcase project
npm run dev                       # http://localhost:3000
npm run inngest                   # second terminal: Inngest dev server for background research
```

Leave `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` empty locally; with a signing key set, the app sends jobs to Inngest Cloud instead of the local dev server.

**No Qloo key?** Set `PROVIDER_MODE=fixture`. Cultural signals are then synthetic, prefixed "Simulated", and every screen shows a *Simulated data* badge. Fixture data is never presented as research.

## Scripts

| Command | Purpose |
|---|---|
| `npm run check` | Lint, typecheck and all unit + integration tests |
| `npm test` | Vitest (integration tests use the Docker Postgres `outbranch_test` database) |
| `npm run test:e2e` | Playwright journey and accessibility tests (desktop and mobile) against a seeded dev server |
| `npm run db:seed` | Create the simulated showcase project |
| `npx tsx --conditions=react-server scripts/ablation.ts <projectId>` | Run the Qloo ablation for a completed project |
| `npx tsx --conditions=react-server scripts/showcase.ts <projectId>` | Publish a completed project as the read-only showcase |

Before the first integration test run: `docker exec outbranch-db-1 psql -U outbranch -c "CREATE DATABASE outbranch_test"`
and `DATABASE_URL=postgresql://outbranch:outbranch@localhost:5442/outbranch_test npx prisma migrate deploy`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): system design, pipeline, evidence model, security
- [Deployment](docs/DEPLOYMENT.md): Vercel + Neon + Inngest Cloud
- [Qloo ablation](docs/evaluation/ablation.md): method and results
- [Devpost submission](docs/HACKATHON.md): elevator pitch, project story and built-with tags

## Data handling

Qloo responses are cached privately in Postgres for provenance and to avoid repeat calls. They are never committed to this repository; the evaluation script writes per-entity detail to the git-ignored `eval-output/` folder. API keys stay server-side and never appear in client bundles, logs, reports or error messages.

## License

[MIT](LICENSE)
