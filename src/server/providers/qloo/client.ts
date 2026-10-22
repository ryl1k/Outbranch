import "server-only"
import { createHash } from "node:crypto"
import type { z } from "zod"
import type { DataMode } from "@/generated/prisma/client"
import { db } from "@/server/db"
import { env } from "@/server/env"
import { recordUsage, type UsageContext } from "@/server/usage/record"
import { ProviderResponseError, ProviderUnavailableError } from "../errors"
import { fixtureResponse } from "./fixtures"
import {
  audiencesResponseSchema,
  compareResponseSchema,
  insightsResponseSchema,
  searchResponseSchema,
  tagsResponseSchema,
  type InsightsParams,
} from "./types"

const TIMEOUT_MS = 20_000
const MAX_RETRIES = 2
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type QlooResult<T> = {
  data: T
  queryId: string
  dataMode: DataMode
  cached: boolean
}

export function qlooMode(): DataMode {
  return env.PROVIDER_MODE === "fixture" ? "FIXTURE" : "LIVE"
}

export function qlooAvailable() {
  return qlooMode() === "FIXTURE" || Boolean(env.QLOO_API_KEY)
}

type Params = Record<string, string | number | boolean | string[] | undefined>

/** Flatten params into the documented GET encoding: arrays become comma-separated lists. */
export function encodeParams(params: Params): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(params).sort()) {
    const v = params[key]
    if (v === undefined) continue
    if (Array.isArray(v)) {
      if (v.length) out[key] = v.join(",")
    } else out[key] = String(v)
  }
  return out
}

function cacheKey(mode: DataMode, endpoint: string, params: Record<string, string>) {
  return createHash("sha256").update(`${mode}|${endpoint}|${JSON.stringify(params)}`).digest("hex")
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchLive(endpoint: string, params: Record<string, string>) {
  if (!env.QLOO_API_KEY) throw new ProviderUnavailableError("qloo", "QLOO_API_KEY is not configured")
  const url = new URL(endpoint, env.QLOO_API_URL)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": env.QLOO_API_KEY, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      })
      if (res.status === 429 || res.status >= 500) {
        lastError = new ProviderResponseError("qloo", `Qloo ${endpoint} returned ${res.status}`, true)
        const retryAfter = Number(res.headers.get("retry-after"))
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** attempt)
        continue
      }
      const body: unknown = await res.json().catch(() => null)
      return { status: res.status, body, retries: attempt }
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await sleep(800 * 2 ** attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderResponseError("qloo", "Qloo request failed", true)
}

function errorMessage(body: unknown) {
  const errors = (body as { errors?: { message?: string }[] } | null)?.errors
  return (
    errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join("; ") || "unknown error"
  )
}

/**
 * Perform (or reuse) a Qloo request. Every response is persisted in QlooQuery so
 * each cultural relationship can cite the exact query that produced it.
 */
async function request<S extends z.ZodType>(
  ctx: UsageContext,
  endpoint: string,
  rawParams: Params,
  schema: S,
): Promise<QlooResult<z.infer<S>>> {
  const mode = qlooMode()
  const params = encodeParams(rawParams)
  const key = cacheKey(mode, endpoint, params)
  const started = Date.now()

  const cached = await db.qlooQuery.findUnique({ where: { cacheKey: key } })
  if (cached && cached.status === 200 && Date.now() - cached.retrievedAt.getTime() < CACHE_TTL_MS) {
    const parsed = schema.safeParse(cached.response)
    if (parsed.success) {
      await recordUsage(ctx, { provider: "QLOO", durationMs: Date.now() - started, cacheHit: true, ok: true })
      return { data: parsed.data, queryId: cached.id, dataMode: cached.dataMode, cached: true }
    }
  }

  let status = 200
  let body: unknown
  let retries = 0
  try {
    if (mode === "FIXTURE") {
      body = fixtureResponse(endpoint, params)
    } else {
      ;({ status, body, retries } = await fetchLive(endpoint, params))
    }
  } catch (error) {
    await recordUsage(ctx, { provider: "QLOO", durationMs: Date.now() - started, ok: false, retries: MAX_RETRIES })
    throw error
  }

  const durationMs = Date.now() - started
  await recordUsage(ctx, { provider: "QLOO", durationMs, retries, ok: status === 200 })
  if (status !== 200) {
    throw new ProviderResponseError("qloo", `Qloo ${endpoint} ${status}: ${errorMessage(body)}`)
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ProviderResponseError("qloo", `Unexpected Qloo ${endpoint} response shape`)
  }

  const row = await db.qlooQuery.upsert({
    where: { cacheKey: key },
    create: { cacheKey: key, endpoint, params, response: body as object, status, dataMode: mode, durationMs },
    update: { response: body as object, status, durationMs, retrievedAt: new Date() },
  })
  return { data: parsed.data, queryId: row.id, dataMode: mode, cached: false }
}

export const qloo = {
  searchEntities(ctx: UsageContext, query: string, opts: { types?: string[]; take?: number } = {}) {
    return request(ctx, "/search", { query, types: opts.types, take: opts.take ?? 5 }, searchResponseSchema)
  },
  searchTags(ctx: UsageContext, query: string, opts: { tagTypes?: string[]; take?: number } = {}) {
    return request(
      ctx,
      "/v2/tags",
      { "filter.query": query, "filter.tag.types": opts.tagTypes, take: opts.take ?? 5 },
      tagsResponseSchema,
    )
  },
  insights(ctx: UsageContext, params: InsightsParams) {
    return request(ctx, "/v2/insights", params, insightsResponseSchema)
  },
  audiences(ctx: UsageContext, audienceTypes: string[], take = 20) {
    return request(ctx, "/v2/audiences", { "filter.audience.types": audienceTypes, take }, audiencesResponseSchema)
  },
  compare(ctx: UsageContext, a: string[], b: string[]) {
    return request(
      ctx,
      "/v2/analysis/compare",
      { "a.signal.interests.entities": a, "b.signal.interests.entities": b },
      compareResponseSchema,
    )
  },
}
