import "server-only"
import { z } from "zod"

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1")

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be set (npx auth secret)"),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_ENABLE_GUEST: bool,
  /** New guest accounts allowed per IP in 24 hours. Keep above 1: venues and offices share an IP. */
  GUEST_SIGNUPS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(5),
  ANTHROPIC_API_KEY: z.string().optional(),
  QLOO_API_KEY: z.string().optional(),
  QLOO_API_URL: z.string().url().default("https://hackathon.api.qloo.com"),
  PROVIDER_MODE: z.enum(["live", "fixture"]).default("live"),
  /** Global guardrails for public demos (guest sign-in creates unlimited workspaces). */
  GLOBAL_JOBS_PER_HOUR: z.coerce.number().int().positive().default(60),
  DAILY_SPEND_LIMIT_USD: z.coerce.number().positive().optional(),
  /** Billing: leave unset to disable checkout (the free-tier limits still apply). */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /** Public origin used for Stripe return URLs; derived from the request when unset. */
  APP_URL: z.string().url().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
})

export type Env = z.infer<typeof schema>

function load(): Env {
  const parsed = schema.safeParse(
    Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v])),
  )
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return parsed.data
}

export const env = load()

/** Which providers are configured for live use. Never exposes the secrets themselves. */
export function providerStatus() {
  return {
    mode: env.PROVIDER_MODE,
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    qloo: Boolean(env.QLOO_API_KEY),
    githubAuth: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
    guestAuth: env.AUTH_ENABLE_GUEST,
  }
}
