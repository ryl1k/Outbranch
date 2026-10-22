# Outbranch: Qloo Agentic Hackathon 2026 submission

**Tagline:** See further. Grow smarter.

## Inspiration

Brands sit on a question every strategy team asks: *where should we grow next?* The usual answers come from instinct, trend decks or a competitor's last move. Yet the strongest signal is already out there: what a brand's audience loves outside the brand. People who love a canned-water company built on heavy-metal humour also love particular tattoo brands, skate retailers, horror games and comedy shows. Those connections point to partners, products and markets. Qloo's Taste AI can see them; nobody was turning them into decisions.

## What it does

Outbranch turns cultural intelligence into structured, evidence-backed commercial expansion hypotheses.

1. **Enter one identifier.** A brand, company, product, entertainment IP, website or a sentence. Ambiguous names (or parent companies with many brands) ask you to pick the right scope.
2. **Research and verify.** Claude researches public sources and builds a profile in which every claim is marked Verified (with its source), Inferred or Uncertain. You correct it and confirm it before anything else runs.
3. **Map the culture.** Outbranch resolves the brand, its documented cultural associations and its themes to real Qloo entities and tags. It plans which domains matter, then queries Qloo Insights with explainability across brands, artists, games, shows, movies and places.
4. **Generate hypotheses with a business model.** Claude proposes opportunities that must cite the Qloo relationships behind them and state who pays whom for what. Hypotheses without Qloo evidence are discarded.
5. **Test the commercial case.** The top hypotheses get web research on competitors, costs, licensing, precedent and contradicting evidence.
6. **Decide.** Opportunities are ranked on eight explicit criteria, each labelled measured, model assessment or no data. You can then explore an interactive cultural network, compare directions side by side (including Qloo's taste-overlap analysis), open twelve-section deep dives, refine the scope, and export reports.

## How we built it

- **Next.js 16** full stack (App Router, Server Actions, Route Handlers), TypeScript strict, **PostgreSQL + Prisma**, Tailwind + shadcn/ui, React Flow.
- **Inngest** runs research as durable, step-memoised jobs with retries, cancellation, bounded concurrency, crash recovery and live progress over Server-Sent Events.
- **Anthropic Claude Sonnet 5.5** (research, generation, evaluation) and **Haiku 5.5** (classification), with server-side web search and fetch, structured outputs validated by zod, and refusal fallback.
- **Qloo**: `/search`, `/v2/tags`, `/v2/insights` (explainability, signal-based location re-weighting), `/v2/analysis/compare`. Every relationship stores the query that produced it.

## What makes it different

- **Evidence over eloquence.** Three kinds of knowledge (Qloo signals, sourced facts and AI hypotheses) are stored, displayed and exported separately. A proposed partner is never shown as an existing one.
- **Honest numbers.** Evidence strength and ranking are computed from what was collected. Missing data is shown as missing. No success probabilities, no fabricated market sizes.
- **We measured Qloo's contribution.** In a reproducible ablation on identical inputs, 66% of the entities in Qloo-enhanced hypotheses were verified Qloo audience affinities, against 2% for LLM-only. Every Qloo-enhanced opportunity had a verifiable cultural link, against 1 of 8 for LLM-only. The write-up also states what that metric does not prove.

## Challenges

- Turning taste affinity into business logic without implying that affinity predicts revenue.
- Keeping LLM output honest: alias-based citations, server-side downgrading of unsupported "verified" claims, and deterministic ranking.
- Verifying the Qloo API's real behaviour (for example, which location parameters affect which entity types) rather than assuming it.

## What's next

Audience-signal analysis (Qloo audiences), trend tracking over time, team workspaces, and validation tracking: recording which hypotheses a company tested and what happened.

## Try it

The public demo signs you in as a guest. Open **See a finished study** for a completed showcase, or start your own research from any brand name.
