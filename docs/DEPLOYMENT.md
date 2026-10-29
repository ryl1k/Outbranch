# Deploying Outbranch

The reference deployment is **Vercel** (Next.js), **Neon** (Postgres) and **Inngest Cloud**
(background jobs). Any Node host with Postgres works; Inngest must be able to reach
`https://<your-domain>/api/inngest`.

## 1. Database

The Neon project is linked through `neon.ts` (Postgres only). `npx neon@latest env pull --file .env.neon`
writes `DATABASE_URL` (pooled `-pooler` host, for the app) and `DATABASE_URL_UNPOOLED` (direct, for
migrations). `prisma.config.ts` prefers `DATABASE_URL_UNPOOLED`, because Prisma Migrate breaks behind PgBouncer.

```bash
set -a && . ./.env.neon && set +a && npx prisma migrate deploy
```

Vercel production builds run this automatically (see section 4).

## 2. Inngest

1. Create an Inngest app and copy the **event key** and **signing key** (Production environment).
2. With `INNGEST_SIGNING_KEY` set, the app runs Inngest in cloud mode. Without it, the app assumes a
   local dev server, so make sure the key is set in production.

## 3. Vercel

Import the repository and set these environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | pooled Postgres connection string |
| `DATABASE_URL_UNPOOLED` | direct connection string, used only by the build to migrate (Production only) |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_ENABLE_GUEST` | `true` (lets judges and visitors in without an account) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | optional GitHub OAuth app |
| `ANTHROPIC_API_KEY` | workspace-scoped Anthropic key |
| `QLOO_API_KEY` | Qloo key |
| `QLOO_API_URL` | `https://hackathon.api.qloo.com` for hackathon keys |
| `PROVIDER_MODE` | `live` |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | from step 2 |
| `GLOBAL_JOBS_PER_HOUR` | deployment-wide research jobs per hour (default 60) |
| `DAILY_SPEND_LIMIT_USD` | optional cap on 24h model-token spend; a full study costs about $0.80 in tokens plus web searches |

The build command is `npm run build` (it runs `prisma generate`, then migrations on production builds). Function duration: the
Inngest route sets `maxDuration = 300`, and each step is a separate short invocation.

After the first deploy, sync the app in the Inngest dashboard using `https://<your-domain>/api/inngest`
(or `curl -X PUT https://<your-domain>/api/inngest`). The Inngest Vercel integration does this, and sets
the two Inngest keys, automatically on every deploy.

## 4. CI/CD

- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, unit and integration tests (against a Postgres
  service) and a production build on pushes to `main`/`dev` and on every pull request. It needs no secrets.
- **CD:** Vercel's Git integration deploys every push to `main` to production (other branches get previews).
  `scripts/vercel-migrate.mjs` applies Prisma migrations during production builds only, over
  `DATABASE_URL_UNPOOLED`; a missing variable fails the build rather than shipping code against an old schema.

## 5. Showcase

Run one complete study in production, then publish it read-only for visitors:

```bash
DATABASE_URL="<connection string>" npx tsx --conditions=react-server scripts/showcase.ts <projectId>
```

`/showcase` (linked from the landing page) opens the most recent showcase after guest sign-in.

## 6. Verify

- `GET /api/health` should return `{"status":"ok","database":"ok", ...}` with both providers `true`.
- Sign in as a guest, run a study end to end, and watch the job in the Inngest dashboard.
