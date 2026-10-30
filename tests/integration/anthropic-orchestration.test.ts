import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

type Msg = Record<string, unknown>
const queue: Msg[] = []
const calls: Record<string, unknown>[] = []

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    beta = {
      messages: {
        stream: (params: Record<string, unknown>) => {
          calls.push({ ...params, messages: [...(params.messages as unknown[])] })
          const next = queue.shift()
          if (!next) throw new Error("No mocked response queued")
          return { finalMessage: async () => next }
        },
      },
    }
  }
  return { default: Anthropic }
})

const { generateStructured, webResearch } = await import("@/server/providers/anthropic/client")
const { ProviderResponseError } = await import("@/server/providers/errors")
const { db } = await import("@/server/db")
const { resetDb } = await import("../helpers/db")

const usage = (input = 100, output = 50, searches = 0) => ({
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: 0,
  server_tool_use: { web_search_requests: searches, web_fetch_requests: 0 },
})
const text = (t: string, extra: Msg = {}) => ({ type: "text", text: t, ...extra })

describe("Claude orchestration (integration, SDK mocked)", () => {
  beforeEach(async () => {
    await resetDb()
    queue.length = 0
    calls.length = 0
  })

  const schema = z.object({ name: z.string(), score: z.number() })

  it("returns schema-valid structured output and records token cost", async () => {
    queue.push({ stop_reason: "end_turn", content: [text('{"name":"Acme","score":3}')], usage: usage(1_000_000, 0) })
    const out = await generateStructured({
      ctx: { operation: "test.structured" },
      model: "claude-sonnet-5-5",
      schema,
      system: "sys",
      prompt: "p",
    })
    expect(out).toEqual({ name: "Acme", score: 3 })
    expect(calls[0]).toMatchObject({ model: "claude-sonnet-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] })
    expect(String(calls[0].system)).toContain("untrusted DATA")
    const row = await db.usageRecord.findFirstOrThrow()
    expect(row).toMatchObject({ provider: "ANTHROPIC", ok: true, inputTokens: 1_000_000, costUsd: 2 })
  })

  it("does not request server-side fallback for Haiku", async () => {
    queue.push({ stop_reason: "end_turn", content: [text('{"name":"A","score":1}')], usage: usage() })
    await generateStructured({ ctx: { operation: "t" }, model: "claude-haiku-5-5", schema, system: "s", prompt: "p" })
    expect(calls[0].fallbacks).toBeUndefined()
  })

  it("rejects output that fails validation and records a failed call", async () => {
    queue.push({ stop_reason: "end_turn", content: [text('{"name":"Acme"}')], usage: usage() })
    await expect(
      generateStructured({ ctx: { operation: "t" }, model: "claude-sonnet-5-5", schema, system: "s", prompt: "p" }),
    ).rejects.toBeInstanceOf(ProviderResponseError)
    expect((await db.usageRecord.findFirstOrThrow()).ok).toBe(false)
  })

  it("treats refusals and truncation as provider errors", async () => {
    queue.push({ stop_reason: "refusal", stop_details: { category: "cyber" }, content: [], usage: usage() })
    await expect(
      generateStructured({ ctx: { operation: "t" }, model: "claude-sonnet-5-5", schema, system: "s", prompt: "p" }),
    ).rejects.toThrow(/declined.*cyber/)
    queue.push({ stop_reason: "max_tokens", content: [text('{"name":')], usage: usage() })
    await expect(
      generateStructured({ ctx: { operation: "t" }, model: "claude-sonnet-5-5", schema, system: "s", prompt: "p" }),
    ).rejects.toThrow(/truncated/)
  })

  it("continues paused web research turns and harvests every consulted source", async () => {
    queue.push({
      stop_reason: "pause_turn",
      content: [
        {
          type: "web_search_tool_result",
          content: [{ type: "web_search_result", url: "https://a.example", title: "A", page_age: "2 days ago", encrypted_content: "" }],
        },
        text("First half. "),
      ],
      usage: usage(100, 10, 1),
    })
    queue.push({
      stop_reason: "end_turn",
      content: [
        { type: "web_fetch_tool_result", content: { type: "web_fetch_result", url: "https://b.example", content: { title: "B" } } },
        text("Second half.", { citations: [{ type: "web_search_result_location", url: "https://a.example", title: "A", cited_text: "quoted" }] }),
      ],
      usage: usage(200, 20, 2),
    })
    const res = await webResearch({ ctx: { operation: "t" }, model: "claude-sonnet-5-5", system: "s", prompt: "p", maxFetches: 0 })

    expect(res.notes).toBe("First half. Second half.")
    expect(res.sources).toEqual([
      { url: "https://a.example", title: "A", pageAge: "2 days ago", citedText: "quoted" },
      { url: "https://b.example", title: "B" },
    ])
    expect(calls).toHaveLength(2)
    expect((calls[1].messages as unknown[]).length).toBe(2) // paused assistant turn replayed
    expect((calls[0].tools as { type: string }[]).map((t) => t.type)).toEqual(["web_search_20260209"])
    const row = await db.usageRecord.findFirstOrThrow()
    expect(row).toMatchObject({ inputTokens: 300, outputTokens: 30, webSearches: 3, ok: true })
  })
})
