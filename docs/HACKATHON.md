# Outbranch: Devpost submission

Copy for the [Qloo Agentic Hackathon 2026](https://qloo.devpost.com/) submission form. Each section maps to a Devpost field.

- **Live demo:** https://outbranch.vercel.app
- **Code:** https://github.com/ryl1k/Outbranch (MIT)
- **Thumbnail:** [`docs/assets/thumbnail.png`](assets/thumbnail.png) (1500 × 1000, 3:2)

---

## Project name

Outbranch

## Elevator pitch

> 200 characters max on Devpost. This one is 175.

An AI research agent that turns Qloo taste data into ranked, evidence-backed growth opportunities: who to partner with, what to launch and where your brand should expand next.

---

## About the project

### Inspiration

Every brand eventually asks the same question: *where should we grow next?* The answer usually comes from a strategy deck, a consultant's intuition or a competitor's last move. Yet the strongest signal already exists, and almost nobody uses it: **what a brand's audience loves outside the brand.**

People who love Aesop also love particular Paris boutique hotels, Liberty London, Le Labo and certain alt-pop artists. Each of those affinities is a door: a partner, a product line, a city, a retail channel. Qloo's Taste AI can see those doors across music, film, dining, fashion, travel and brands. We built the agent that walks through them and comes back with a business case.

### What it does

Outbranch is a research agent for brand, partnership and expansion teams. You type one thing (a brand, a company, a product, an entertainment IP or a website) and it runs a full study:

1. **Identifies the entity.** It resolves the name with web search. Ambiguous names and parent companies ask you to pick the right scope ("Disney the company, or Pixar?").
2. **Researches the brand and asks you to verify it.** It builds a profile in which every claim is labelled *Verified* (with its source), *Inferred* or *Uncertain*. You correct it and confirm it. Nothing else runs until you do.
3. **Maps the brand's culture with Qloo.** It resolves the brand and its documented associations to Qloo entities and tags, plans which cultural domains matter, then queries Qloo Insights with explainability across brands, artists, places, destinations, books, games, TV and film.
4. **Generates hypotheses that must cite Qloo.** Claude proposes opportunities, and each one has to name the Qloo relationships behind it and state a revenue mechanism: who pays whom, for what. A hypothesis without Qloo evidence is discarded.
5. **Tests the commercial case.** The top hypotheses get sourced web research on competitors, costs, licensing, precedent and evidence *against* the idea.
6. **Ranks and explains.** Eight explicit criteria (cultural relevance, strategic fit, business-model clarity, commercial potential, differentiation, feasibility, risk, uncertainty), each marked *measured*, *model assessment* or *no data*. The ranking and evidence strength are computed in code from what was actually collected, not asked of the model.

Then you work with the result:

- **Opportunity portfolio** with categories, evidence strength and the Qloo entities behind each idea.
- **Interactive cultural network:** one brand at the centre, Qloo affinities around it, opportunities on the outside. Selecting an opportunity traces its evidence chain back to the brand.
- **Side-by-side comparison**, including Qloo's taste-overlap analysis between the entities behind two directions.
- **Strategic deep dives:** market research, competitive landscape, financial assumptions (marked as estimates), key risks, a validation plan and reversible next steps.
- **Refinement:** exclude ideas, narrow markets or categories, and rerun discovery as a new iteration.
- **Reports:** printable briefs and Markdown export that only restate saved research.
- **Research log:** every run drawn as a graph of the AI calls, web searches and Qloo requests it made, with failures and cache hits.

### Why Qloo is essential, measured

The hackathon brief says: *"If your submission would work the same without Qloo, you're building the wrong thing."* So we tested it. Our ablation script ([method and results](https://github.com/ryl1k/Outbranch/blob/main/docs/evaluation/ablation.md)) gives the same model, prompt and confirmed brand profile to two arms, one with Qloo relationships and one without:

| Liquid Death, measured | With Qloo | LLM only |
|---|---|---|
| Named entities verified as real audience affinities | **66%** (21 of 32) | 2% (1 of 48) |
| Opportunities with at least one verifiable cultural link | **7 of 7** | 1 of 8 |
| Distinct verified cultural domains | **4** | 1 |

Without Qloo, the model still writes confident cultural claims; almost none of them can be checked. With Qloo, every opportunity stands on a taste relationship you can inspect. We also state what this does *not* prove: the metric measures groundedness, not commercial success.

### How we built it

- **An agent pipeline, not a chat box.** The research runs as durable [Inngest](https://www.inngest.com) workflows: each step is memoised, retried, cancellable and resumable after a crash, with per-workspace and global concurrency limits. Progress streams to the browser live.
- **Claude as the researcher.** Anthropic's Claude (Haiku 5.5 in production) runs with server-side web search and web fetch for entity resolution, brand research and commercial investigation. Every structured output is validated with zod; unsupported "verified" claims are downgraded on the server.
- **Qloo as the ground truth for taste.** `/search` and `/v2/tags` resolve the brand and its themes to real entities; `/v2/insights` with `feature.explainability` gathers affinities per domain; `/v2/analysis/compare` powers taste overlap. Every relationship stores the exact query that produced it, so any edge in the network can be traced to its source.
- **Three kinds of knowledge, kept apart.** Qloo signals, sourced market evidence and AI hypotheses are stored, displayed and exported separately. A proposed partner is always labelled a proposal.
- **Product stack.** Next.js 16 (App Router, Server Actions), TypeScript strict, PostgreSQL on Neon with Prisma 7, Auth.js (guest, email and GitHub sign-in), Tailwind CSS 4 with shadcn/ui, React Flow for the network, RevenueCat for the Pro plan, deployed on Vercel. 89 unit and integration tests (Vitest) run on every push in GitHub Actions, plus Playwright journeys and accessibility checks on desktop and mobile.

### Challenges we ran into

- **Affinity is not demand.** Turning "this audience also likes X" into a business idea without pretending it predicts revenue. We solved it with explicit revenue mechanisms, separate commercial research, and criteria that say when there is no data.
- **Keeping an LLM honest.** Models love to cite. We made citations alias-based and checked server-side, discarded hypotheses without Qloo evidence, and moved ranking out of the model entirely.
- **Learning Qloo's real behaviour.** We tested which parameters affect which entity types (for example, location weighting) instead of assuming, and resolved entities to Qloo IDs before every insight query.
- **Long-running agents on serverless.** A full study takes several minutes and dozens of calls. Durable steps with memoisation let it survive timeouts, retries and deploys without paying for the same work twice.

### Accomplishments that we're proud of

- A complete product, not a demo: sign-in, onboarding, verification, research, exploration, comparison, reports, billing and dark mode, usable on laptops and phones.
- Every number on screen comes from collected data. No invented market sizes, no success probabilities.
- We measured Qloo's contribution instead of claiming it.

### What we learned

Cultural data is most valuable when it is *traceable*. The moment we let a user click an opportunity and see the exact Qloo affinities and the exact query behind it, the output stopped feeling like AI copy and started feeling like research a team could defend in a meeting.

### What's next for Outbranch

- Qloo audience signals to size who the opportunity reaches.
- Trend tracking: rerun a study monthly and see which affinities are rising.
- Team workspaces with shared shortlists and comments.
- Validation tracking: record which hypotheses a company tested and what happened, so the system learns what good opportunities look like.

### Try it in two minutes

1. Open **https://outbranch.vercel.app** and choose **Continue as guest**. No account needed.
2. Open the finished showcase study to explore a complete result: portfolio, network, comparison and deep dives.
3. Or start **New research** with any brand, for example *Liquid Death*, *Patagonia* or *aesop.com*. A full study takes about five minutes.

---

## Built with

Paste these as Devpost "Built with" tags:

`qloo` `qloo-insights-api` `claude` `anthropic` `typescript` `next.js` `react` `node.js` `postgresql` `neon` `prisma` `inngest` `auth.js` `tailwindcss` `shadcn-ui` `react-flow` `zod` `revenuecat` `vercel` `vitest` `playwright` `github-actions`
