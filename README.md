# outbranch

**See further. Grow smarter.**

Outbranch turns cultural intelligence into evidence-backed growth opportunities. Enter a
brand, company, product, entertainment IP or website. Outbranch researches it, asks you to
confirm what it found, maps its audience's taste with [Qloo](https://qloo.com) Taste AI,
and uses Claude to turn those cultural relationships into ranked commercial expansion
hypotheses: each one has a revenue mechanism, proposed partners, sourced market research,
explicit risks, and a validation plan.

Built for the [Qloo Agentic Hackathon 2026](https://qloo.devpost.com/). Open source under the [MIT licence](LICENSE).

## What it does

| Stage | What happens | Where the evidence comes from |
|---|---|---|
| **Input** | One field: a name, a website or a sentence. Optional context can be added. | You |
| **Identify** | Resolves the entity; ambiguous names and parent companies ask you to choose. | Claude + web search |
| **Research** | Builds a brand profile where every claim is Verified, Your input, Inferred or Uncertain. | Public sources, cited |
| **Verify** | You correct the summary, remove wrong claims or associations and add context. Discovery cannot start until you confirm. | You |
| **Discover** | Plans which cultural domains to query, gathers Qloo affinities with explainability, interprets them, and generates hypotheses that must cite their evidence. | Qloo Insights, Claude |
| **Investigate** | The top hypotheses get web research on competitors, costs, licensing, precedent and contradicting evidence. | Public sources, cited |
| **Evaluate** | Eight explicit criteria, each with a basis (measured, model assessment, no data). Ranking and evidence strength are computed deterministically from what was collected. | Claude + TypeScript |
| **Explore** | Ranked portfolio, interactive cultural network, side-by-side comparison with Qloo taste overlap, twelve-section deep dives. | All of the above |
| **Report** | Printable briefs and Markdown export that restate saved research only. | Saved research |

Outbranch keeps three kinds of knowledge apart everywhere in the product: **Qloo cultural
signals**, **sourced market evidence**, and **AI-generated hypotheses**. Proposed partners
are always labelled as proposals.

## Does Qloo actually help?

[`docs/evaluation/ablation.md`](docs/evaluation/ablation.md) compares LLM-only and
Qloo-enhanced generation on identical inputs. On the first run (Liquid Death), **66% of the
entities in Qloo-enhanced hypotheses were verified Qloo audience affinities, against 2% for
LLM-only**; every Qloo-enhanced opportunity had a verifiable cultural link, against 1 of 8.
The document also explains what that metric does and does not prove.

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 + shadcn/ui · PostgreSQL + Prisma 7 ·
Auth.js · Inngest (durable background jobs) · Anthropic Claude (Sonnet 5.5 for research and
reasoning, Haiku 5.5 for classification) with server-side web search · Qloo Insights API ·
React Flow · Vitest + Playwright.

## Run it locally

Requirements: Node 22+, Docker.

```bash
cp .env.example .env              # add ANTHROPIC_API_KEY and QLOO_API_KEY; set AUTH_SECRET (npx auth secret)
docker compose up -d db           # Postgres on localhost:5442
npm install
npx prisma migrate deploy
npm run db:seed                   # optional: a clearly simulated showcase project
npm run dev                       # http://localhost:3000
npm run inngest                   # in a second terminal: Inngest dev server for background research
```

Sign in with **Continue as guest** and start from **New research**, or open the showcase.

**No Qloo key?** Set `PROVIDER_MODE=fixture`. Cultural signals are then synthetic, prefixed
"Simulated", and every screen shows a *Simulated data* badge. Fixture data is never
presented as research.

## Scripts

| Command | Purpose |
|---|---|
| `npm run check` | Lint, typecheck and all unit + integration tests |
| `npm test` | Vitest (integration tests need the Docker Postgres; they use the `outbranch_test` database) |
| `npm run test:e2e` | Playwright journey tests (desktop and mobile) against a seeded dev server |
| `npm run db:seed` | Create the simulated showcase project |
| `npx tsx --conditions=react-server scripts/ablation.ts <projectId>` | Run the Qloo ablation for a completed project |
| `npx tsx --conditions=react-server scripts/showcase.ts <projectId>` | Publish a completed project as a read-only showcase |

Before the first integration test run: `docker exec outbranch-db-1 psql -U outbranch -c "CREATE DATABASE outbranch_test"`
and `DATABASE_URL=postgresql://outbranch:outbranch@localhost:5442/outbranch_test npx prisma migrate deploy`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): system design, pipeline, evidence model, security
- [Deployment](docs/DEPLOYMENT.md): Vercel + Neon + Inngest Cloud
- [Qloo ablation](docs/evaluation/ablation.md): method and results
- [Hackathon submission](docs/HACKATHON.md): project description

## Data handling

Qloo responses are cached privately in Postgres to provide provenance and avoid repeat calls.
They are never committed to this repository, and the evaluation script writes
per-entity detail to the git-ignored `eval-output/` folder. API keys stay server-side and never
appear in client bundles, logs, reports or error messages.

## License

[MIT](LICENSE)
