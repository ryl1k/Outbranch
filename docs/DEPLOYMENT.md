# Deploying Outbranch

The reference deployment is **Vercel** (Next.js), **Neon** (Postgres) and **Inngest Cloud**
(background jobs). Any Node host with Postgres works; Inngest must be able to reach
`https://<your-domain>/api/inngest`.

## 1. Database

1. Create a Postgres database. With Neon, copy both the **pooled** connection string (for the app)
   and the **direct** one (for migrations; pooled connections can break `prisma migrate`).
2. Run migrations from your machine using the direct connection string:

   ```bash
   DATABASE_URL="<connection string>" npx prisma migrate deploy
   ```

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

## 4. Showcase

Run one complete study in production, then publish it read-only for visitors:

```bash
DATABASE_URL="<connection string>" npx tsx --conditions=react-server scripts/showcase.ts <projectId>
```

`/showcase` (linked from the landing page) opens the most recent showcase after guest sign-in.

## 5. Verify

- `GET /api/health` should return `{"status":"ok","database":"ok", ...}` with both providers `true`.
- Sign in as a guest, run a study end to end, and watch the job in the Inngest dashboard.
