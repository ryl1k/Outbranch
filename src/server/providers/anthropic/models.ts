/**
 * Model routing. The deepest model handles synthesis and judgement; cheaper
 * models handle web research and simple extraction.
 */
export type ModelId = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5"

export const MODELS = {
  /** opportunity discovery, evaluation, deep dives, reports (Haiku to keep cost down; set to claude-sonnet-5-5 for deeper analysis) */
  reasoning: "claude-haiku-5-5",
  /** web research with server-side search/fetch (Haiku to keep cost down; set to claude-sonnet-5-5 for deeper research) */
  research: "claude-haiku-5-5",
  /** classification, normalization, short extraction */
  fast: "claude-haiku-5-5",
} as const satisfies Record<string, ModelId>

/** First-party list prices, USD per million tokens (cached 2026-10). */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  // Haiku cache-read price not published in our reference; bill at input price (upper bound).
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.1 },
}

/** Server-side fallback on refusal is available for Opus and Sonnet, not Haiku. */
export function supportsFallback(model: ModelId) {
  return model !== MODELS.fast
}

/** Token cost only. Web search requests are counted separately, not priced here. */
export function estimateTokenCostUsd(
  model: string,
  usage: { input: number; output: number; cacheRead: number },
): number | null {
  const price = PRICES[model]
  if (!price) return null
  return (
    (usage.input * price.input + usage.output * price.output + usage.cacheRead * price.cacheRead) /
    1_000_000
  )
}
