<p align="center">
  <img src="docs/assets/thumbnail.png" alt="Outbranch: Where should your brand grow next?" width="760">
</p>

<h1 align="center">outbranch</h1>

<p align="center">
  <strong>An AI research agent that turns Qloo taste data into ranked, evidence-backed growth opportunities.</strong>
</p>

<p align="center">
  <a href="https://outbranch.vercel.app"><strong>Live demo</strong></a> ·
  <a href="#test-it-in-two-minutes">Test it</a> ·
  <a href="docs/evaluation/ablation.md">Qloo ablation</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a>
</p>

<p align="center">Built for the <a href="https://qloo.devpost.com/">Qloo Agentic Hackathon 2026</a> · <a href="LICENSE">MIT licence</a></p>

---

## In one minute

**The problem.** Brand partnership, licensing and expansion teams decide *who to partner with and where to grow next* using trend decks, consultant workshops and gut feel. It is slow, expensive and impossible to audit.

**What Outbranch does.** You type one brand, product, entertainment IP or website. An agent researches it, asks you to confirm what it found, maps what its audience loves with **Qloo Taste AI**, and returns a ranked shortlist of opportunities. Every idea shows:

- the **Qloo affinities** it is built on,
- **who pays whom, for what**,
- **sourced market research**, including evidence against it,
- **risks** and a **validation plan**.

**Why Qloo matters.** On identical inputs, 66% of the entities in Qloo-grounded ideas were real audience affinities, against 2% without Qloo ([details](#does-qloo-actually-help)).

## Test it in two minutes

1. Open **[outbranch.vercel.app](https://outbranch.vercel.app)** and choose **Continue as guest**. No account or payment needed.
2. Open the **showcase study** to see a finished result: portfolio, cultural network, comparison and deep dives.
3. Or start **New research** with any brand (try *Liquid Death*, *Patagonia* or *aesop.com*). Confirm the profile when asked; results arrive in about five minutes.

## What you get

| Screen | What it shows |
|---|---|
| **Opportunity portfolio** | Ranked ideas with category, evidence strength and the Qloo entities behind each |
| **Cultural network** | The brand at the centre, Qloo affinities around it, opportunities outside. Click an idea to trace its evidence back to the brand |
| **Compare** | Ideas side by side, including Qloo taste overlap between them |
| **Deep dive** | Market research, competition, financial assumptions (marked as estimates), risks, validation plan, next steps |
| **Refine** | Exclude ideas or narrow markets and categories, then rerun as a new iteration |
| **Reports** | Printable briefs and Markdown export |
| **Research log** | Each run drawn as a graph of its AI calls, web searches and Qloo requests |

Three kinds of knowledge are always kept apart: **Qloo signals**, **sourced facts** and **AI hypotheses**. Proposed partners are labelled as proposals, and no screen shows an invented market size or success probability.

## How the agent works

```mermaid
flowchart LR
  A[Brand, IP or URL] --> B[Identify<br/>Claude + web search]
  B --> C[Research profile<br/>sourced claims]
  C --> D{You confirm}
  D --> E[Qloo /search + /v2/tags<br/>entities and themes]
  E --> F[Qloo /v2/insights<br/>affinities + explainability]
  F --> G[Hypotheses<br/>must cite Qloo]
  G --> H[Commercial research<br/>web search + fetch]
  H --> I[Ranking in code<br/>8 criteria]
```

1. **Identify** the entity. Ambiguous names ask you to pick the right one.
2. **Research** a profile where every claim is *Verified* (with source), *Inferred* or *Uncertain*.
3. **Confirm.** You correct the profile. Nothing else runs until you approve it.
4. **Map the culture.** Resolve the brand to Qloo entities and tags, choose the domains that matter, and query Qloo Insights with explainability.
5. **Hypothesise.** Claude proposes opportunities that must cite Qloo relationships and state a revenue mechanism. Ideas without Qloo evidence are dropped.
6. **Investigate** the top ideas with sourced web research on competitors, costs, licensing and precedent.
7. **Rank** on eight explicit criteria. Scores and evidence strength are computed in TypeScript from what was collected.

Research runs as durable [Inngest](https://www.inngest.com) workflows, so every step is retried, cancellable and resumable, with live progress in the browser.

## Does Qloo actually help?

[`docs/evaluation/ablation.md`](docs/evaluation/ablation.md) gives the same model, prompt and confirmed profile to two arms, one with Qloo and one without.

| Liquid Death, measured | With Qloo | LLM only |
|---|---|---|
| Named entities that are real audience affinities | **66%** (21 of 32) | 2% (1 of 48) |
| Ideas with at least one verifiable cultural link | **7 of 7** | 1 of 8 |
| Distinct verified cultural domains | **4** | 1 |

This measures groundedness, not commercial success; the write-up explains the limits. The ablation used Claude Sonnet 5.5 and can be rerun with `scripts/ablation.ts`.

## Built with

| Layer | Tools |
|---|---|
| Cultural intelligence | Qloo Insights API: `/search`, `/v2/tags`, `/v2/insights`, `/v2/analysis/compare` |
| AI | Anthropic Claude Haiku 5.5 with server-side web search and fetch, zod-validated outputs |
| Agent runtime | Inngest durable workflows, Server-Sent Events for live progress |
| App | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Flow |
| Data and auth | PostgreSQL on Neon, Prisma 7, Auth.js (guest, email, GitHub) |
| Hosting and billing | Vercel, RevenueCat |
| Quality | Vitest (89 tests), Playwright, GitHub Actions |

---

## Run it locally

**You need:** Node 22+, Docker, an Anthropic API key and a Qloo API key.

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY, QLOO_API_KEY and AUTH_SECRET (npx auth secret)
docker compose up -d db     # Postgres on localhost:5442
npm install
npx prisma migrate deploy
npm run dev                 # http://localhost:3000
npm run inngest             # second terminal: runs the research jobs
```

Then open http://localhost:3000, choose **Continue as guest** and start **New research**.

- **No Qloo key?** Set `PROVIDER_MODE=fixture`. Cultural data is then synthetic and every screen shows a *Simulated data* badge.
- **Keep the Inngest keys empty locally.** With `INNGEST_SIGNING_KEY` set, jobs go to Inngest Cloud instead of your local dev server.
- **Optional demo data:** `npm run db:seed` creates a clearly simulated showcase project.

<details>
<summary><strong>Tests and scripts</strong></summary>

| Command | Purpose |
|---|---|
| `npm run check` | Lint, typecheck, unit and integration tests |
| `npm run test:e2e` | Playwright journey and accessibility tests (desktop and mobile) |
| `npx tsx --conditions=react-server scripts/ablation.ts <projectId>` | Rerun the Qloo ablation for a finished project |
| `npx tsx --conditions=react-server scripts/showcase.ts <projectId>` | Publish a finished project as the read-only showcase |

Integration tests use a separate database. Create it once:

```bash
docker exec outbranch-db-1 psql -U outbranch -c "CREATE DATABASE outbranch_test"
DATABASE_URL=postgresql://outbranch:outbranch@localhost:5442/outbranch_test npx prisma migrate deploy
```

</details>

## Documentation

- [Architecture](docs/ARCHITECTURE.md): system design, pipeline, evidence model and security
- [Deployment](docs/DEPLOYMENT.md): Vercel, Neon and Inngest Cloud
- [Qloo ablation](docs/evaluation/ablation.md): method, results and limitations

## Data handling

Qloo responses are cached privately in Postgres for provenance and are never committed to this repository. API keys stay on the server and never reach the browser, logs or reports.

## License

[MIT](LICENSE)
