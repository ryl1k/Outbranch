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

The deploy workflow runs this on every release, so you only need it by hand for the first setup.

## 2. Inngest

1. Create an Inngest app and copy the **event key** and **signing key** (Production environment).
2. With `INNGEST_SIGNING_KEY` set, the app runs Inngest in cloud mode. Without it, the app assumes a
   local dev server, so make sure the key is set in production.

## 3. Vercel

Import the repository and set these environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | pooled Postgres connection string |
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

The build command is `npm run build` (it runs `prisma generate`). Function duration: the
Inngest route sets `maxDuration = 300`, and each step is a separate short invocation.

After the first deploy, sync the app in the Inngest dashboard using `https://<your-domain>/api/inngest`
(or `curl -X PUT https://<your-domain>/api/inngest`).

## 4. CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` runs lint, typecheck, unit and integration tests (against a Postgres service) and a
  production build on pushes to `main`/`dev` and on every pull request.
- `.github/workflows/deploy.yml` releases on every push to `main` (or by hand with *Run workflow*): it reruns CI,
  applies migrations to Neon, builds with the Vercel CLI, deploys to production, syncs Inngest and checks
  `/api/health`.
- `vercel.json` turns off Vercel's own Git deployments, so the workflow is the only deployer.

Set these in GitHub under *Settings → Secrets and variables → Actions*:

| Kind | Name | Value |
|---|---|---|
| secret | `VERCEL_TOKEN` | Vercel → Account settings → Tokens |
| secret | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `.vercel/project.json` after `npx vercel link` |
| secret | `DATABASE_URL_UNPOOLED` | Neon direct connection string |
| variable | `PRODUCTION_URL` | for example `https://outbranch.vercel.app` |

The app's runtime variables (section 3) live in Vercel; `vercel pull` brings them into the build.

## 5. Showcase

Run one complete study in production, then publish it read-only for visitors:

```bash
DATABASE_URL="<connection string>" npx tsx --conditions=react-server scripts/showcase.ts <projectId>
```

`/showcase` (linked from the landing page) opens the most recent showcase after guest sign-in.

## 6. Verify

- `GET /api/health` should return `{"status":"ok","database":"ok", ...}` with both providers `true`.
- Sign in as a guest, run a study end to end, and watch the job in the Inngest dashboard.
