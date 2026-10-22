# Outbranch — Architecture

Outbranch is one Next.js (App Router, TypeScript strict) application. All backend logic
lives in this codebase; long-running research runs as durable Inngest functions.

## Runtime topology

```
Browser ──► Next.js (RSC pages, Server Actions, Route Handlers)
               │            │
               │            ├─► /api/inngest  (Inngest serve endpoint — durable research steps)
               │            ├─► /api/projects/:id/events (SSE progress stream, reads ResearchEvent)
               │            └─► /api/health
               ▼
          PostgreSQL (Prisma)  ◄── every agent step persists its output + provenance
               ▲
     Providers (server-only): Anthropic (Claude + server web search/fetch) · Qloo
```

Deploy target: Vercel (app) + managed Postgres (Neon) + Inngest Cloud.
Local: `docker compose up -d db` + `npx inngest-cli dev`.

## Research pipeline (Inngest functions, one step per stage)

| Stage | Input | Output (persisted) | Model / provider |
|---|---|---|---|
| 1. Resolve | user identifier | candidate entities (ambiguity → user picks) | Claude Haiku + web search |
| 2. Brand research | confirmed entity + user context | `BrandProfile`, `ResearchSource`, `Claim` (verified / user / inferred / uncertain) | Claude Sonnet + web search/fetch |
| — | **user verifies/edits profile** | `BrandProfile.status = CONFIRMED` | gate: discovery cannot start before this |
| 3. Cultural research | profile themes, references | `QlooEntity`, `QlooTag` (resolved), `CulturalRelationship`, `CulturalInsight` | Qloo search, tags, insights; Claude plans which domains to query |
| 4. Discovery | profile + cultural evidence + constraints | `Opportunity` (AI hypothesis), `EvidenceRef` links | Claude Sonnet 5.5 (high effort), structured output |
| 5. Commercial investigation | top candidates | `ResearchSource`, `Claim` per opportunity | Claude + web search |
| 6. Evaluation | opportunity + evidence | `OpportunityEvaluation` (criteria, rationale, model-assessed vs measured) | Claude Sonnet 5.5, deterministic ranking in TS |
| 7. Deep dive / report | opportunity | `Report` (markdown sections + sources) | Claude |

Each step emits `ResearchEvent` rows (stage, message, timestamps) that the UI streams.
Cancellation uses Inngest `cancelOn`; retries are bounded per step; concurrency is keyed
per user. Token usage and provider calls are recorded in `UsageRecord`.

## Evidence model

Three separate kinds of knowledge, never merged:

1. **Qloo cultural signals** — `CulturalRelationship` with query context, affinity,
   explainability, retrieval timestamp.
2. **External commercial evidence** — `ResearchSource` (URL, title, retrievedAt) + `Claim`.
3. **AI hypotheses** — `Opportunity` / `OpportunityEvaluation`, always labeled as proposed.

Graph edges carry one of these provenances and render differently.

## Provider modes

`PROVIDER_MODE=live|fixture`. Fixture mode serves hand-authored synthetic data that is
labeled in the UI ("Simulated data"). Live Qloo responses are cached server-side in
Postgres only; Qloo response data is never committed to this public repository.

## Security

Env validated with Zod at boot · secrets server-only (`server-only` imports) · Auth.js
sessions + per-project ownership checks · rate limiting on mutation endpoints · URL
validation with SSRF guard (no private IP ranges) · fetched web content wrapped as
untrusted data in prompts, never as instructions · all LLM output validated with Zod.

## Source layout

```
src/
  app/            (marketing)/  (app)/  api/
  components/     ui/ (shadcn) · brand/ · graph/ · research/
  server/
    auth/  db/  env.ts
    providers/    anthropic/  qloo/
    research/     resolve · brand · cultural · discovery · commercial · evaluation · report
    jobs/         inngest client + functions
    graph/        graph preparation
  lib/            shared types, zod schemas, utils
prisma/           schema + migrations
tests/            unit · integration · e2e (Playwright)
```
