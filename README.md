# outbranch

**See further. Grow smarter.**

Outbranch turns cultural intelligence into real growth opportunities. Enter a brand,
company, product or entertainment IP; Outbranch researches it, maps its cultural
relationships through [Qloo](https://qloo.com) Taste AI, and uses Anthropic Claude
agents to turn those relationships into structured, evidence-backed commercial
expansion hypotheses.

Built for the Qloo Agentic Hackathon 2026.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS + shadcn/ui · PostgreSQL + Prisma ·
Auth.js · Inngest · Anthropic SDK · Qloo Insights API · React Flow · Recharts

## Local setup

```bash
cp .env.example .env          # fill in ANTHROPIC_API_KEY, QLOO_API_KEY, AUTH_SECRET
docker compose up -d db       # Postgres on :5442
npm install
npm run dev                   # http://localhost:3000
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design.

## License

[MIT](LICENSE)
