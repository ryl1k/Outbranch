# Outbranch — Architecture

One Next.js 16 application (App Router, TypeScript strict). All backend logic lives in this
codebase; long-running research runs as durable Inngest functions that call back into the
same server modules.

## Runtime topology

```
Browser ──► Next.js
             ├─ Server Components (pages)          read through the data-access layer
             ├─ Server Actions                      every user mutation (validated with zod, rate-limited)
             ├─ /api/inngest                        Inngest serve endpoint: durable research steps
             ├─ /api/projects/:id/events            Server-Sent Events progress, resumable by cursor
             ├─ /api/projects/:id/graph             cultural network as typed JSON
             ├─ /api/reports/:id/markdown           report export
             ├─ /api/health                         liveness + configuration (no secrets)
             └─ /api/auth/*                         Auth.js (guest + optional GitHub)
                          │
                          ▼
                PostgreSQL (Prisma 7, pg driver adapter)
                          ▲
   Providers (server-only): Anthropic Claude (+ server-side web search/fetch) · Qloo Insights
```

Deployment: Vercel (app) + managed Postgres (e.g. Neon) + Inngest Cloud. Locally:
`docker compose up -d db` and `npm run inngest`.

## Research pipeline

Each stage is an Inngest `step.run`, so completed stages are memoised: retries resume at the
failed stage, and expensive LLM calls are split from cheap persistence steps.

| Job | Steps | Models / providers |
|---|---|---|
| `RESOLVE_ENTITY` | web search → ambiguity decision → candidates (auto-continues when unambiguous) | Sonnet 5.5 + web search, Haiku 5.5 |
| `BRAND_RESEARCH` | web research → structured extraction → persist profile, sources, classified claims → resolve brand, references and themes in Qloo | Sonnet 5.5 + web search/fetch, Qloo `/search`, `/v2/tags` |
| — | **user verifies the profile**; editing it later re-opens verification | gate enforced server-side |
| `DISCOVERY` | plan domains → load seeds → Qloo insights per domain → cultural insights → generate hypotheses → commercial investigation of the top 4 (parallel steps) → evaluate → rank | Haiku (plan), Qloo `/v2/insights`, Sonnet 5.5 (high effort) |
| `DEEP_DIVE` | commercial investigation if missing → twelve-section deep dive → re-evaluate → re-rank | Sonnet 5.5 |

Reports are rendered deterministically from saved research (no LLM), so they cannot add claims.

**Job lifecycle.** `ResearchJob` (status, stage, attempts, error) and `ResearchEvent` (stage,
level, message) are written by every step; the UI streams events over SSE. Cancellation sets
`cancelRequestedAt`, sends an Inngest `cancelOn` event, and every stage boundary checks it.
Concurrency is bounded per workspace (2) and globally (6). A sweeper cron marks jobs with no
progress for 30 minutes as interrupted and restores the project to an actionable stage; retry
re-runs the same job kind and reuses persisted stages and cached Qloo responses.

## Evidence model

| Kind | Tables | Rules |
|---|---|---|
| Qloo cultural signals | `QlooEntity`, `QlooTag`, `QlooQuery`, `CulturalRelationship` | Every relationship stores its query, rank within that query, explainability contributors, filters, data mode and retrieval time. Ranks are never compared across queries. |
| External evidence | `ResearchSource`, `Claim` | A claim is `VERIFIED` only if it cites a source that was actually retrieved; otherwise it is downgraded to `INFERRED`. |
| AI hypotheses | `CulturalInsight`, `Opportunity`, `OpportunityEvaluation` | Must cite evidence aliases (R#, I#, S#). Invented aliases are dropped, and opportunities without Qloo evidence are discarded. Partners are stored as `proposed`. |

`EvidenceReference` links hypotheses to evidence with a role (`SUPPORTS`, `CONTRADICTS`, `CONTEXT`).
Evidence strength is derived from counts of Qloo relationships and *opportunity-specific*
verified claims, never from model confidence. `rankScore` is a deterministic function of the
criteria levels and their basis (`src/server/research/ranking.ts`).

Natural-language brand themes are kept separate from Qloo tags. A theme becomes a tag signal
only when `matchTag` finds a genuine token overlap with a real Qloo tag.

## Qloo integration: verified behaviour

Checked against the live hackathon API during development:

- Hackathon keys only work against `https://hackathon.api.qloo.com`, using the `X-Api-Key` header.
- `filter.type` for games is `urn:entity:videogame`; `urn:entity:video_game` is rejected.
- `filter.location.query` is ignored for non-place entity types (identical results). Regional
  focus therefore uses `signal.location.query`, which measurably re-weights brand results, and
  `filter.location.query` is reserved for places and destinations.
- `/search` returns tags with `tag_id`; `/v2/insights` returns `id`; some artist tags have neither. The schema accepts both and skips malformed tags.
- `feature.explainability=true` returns per-result contributor scores, which are used to
  attribute graph edges to the seed that produced them.
- `/v2/audiences` requires `filter.audience.types` or `filter.parents.types`.
- `/v2/analysis/compare` powers the taste-overlap panel in comparisons.

Responses are cached in `QlooQuery` for 7 days (private server-side caching is permitted) and
are never committed to the repository.

## Security and reliability

- **Environment:** validated with zod at start-up (`src/server/env.ts`); secrets only in `server-only` modules.
- **Auth:** Auth.js JWT sessions (guest or GitHub), personal workspaces, and an ownership check on every mutation (`assertProjectAccess`). Showcase projects are readable by any signed-in user and writable by nobody else.
- **Abuse limits:** per-workspace job budgets (hourly and concurrent) and a daily project limit, enforced against persisted history so they hold across serverless instances.
- **Untrusted input:** user URLs pass an SSRF guard (public http(s) hostnames only; private IPs, internal names, credentials and odd ports are rejected). All web and user content is wrapped in `<untrusted_*>` tags, and every system prompt carries an instruction-isolation policy.
- **Outputs:** structured outputs plus zod validation on every LLM call; refusals and truncation become typed provider errors; Claude calls request server-side refusal fallback where supported.
- **Providers:** bounded retries (Anthropic SDK retries; Qloo retries 429 and 5xx with backoff and `retry-after`), timeouts, and user-safe error messages that never include payloads or keys.
- **Cost:** every provider call writes a `UsageRecord` (tokens, web searches, cache hits, retries, duration, cost where list prices are known).

## Source layout

```
src/
  app/
    (marketing)/          landing page, brand system
    (auth)/signin         sign-in
    (workspace)/          projects, project tabs (overview, opportunities, network, compare, reports, log), usage
    api/                  inngest, events (SSE), graph, reports, health, auth
  components/             brand · marketing · research · opportunities · network · reports · workspace · ui (shadcn)
  lib/                    shared zod schemas, graph types and layout
  server/
    auth/  db.ts  env.ts
    providers/            anthropic/ · qloo/ · errors
    research/             resolve · brand · tags · evidence · ranking · discovery/ (context, cultural, opportunities, commercial, evaluate, deep-dive) · taste-overlap
    jobs/                 Inngest client, lifecycle, functions/
    graph/  reports/  evaluation/  usage/  security/  projects/ (actions, queries, presenters)
prisma/                   schema, migrations, seed
tests/                    unit · integration (real Postgres) · helpers
e2e/                      Playwright journeys
scripts/                  ablation · showcase · smoke tests · rerank
```
