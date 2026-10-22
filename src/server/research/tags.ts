import { normalizeName } from "@/server/providers/qloo/normalize"

const STOP = new Set(["and", "or", "of", "the", "a", "an", "culture", "style", "lifestyle", "influence"])

function tokens(s: string) {
  return normalizeName(s)
    .split(" ")
    .map((t) => t.replace(/s$/, ""))
    .filter((t) => t.length > 2 && !STOP.has(t))
}

/**
 * Decide whether a Qloo tag genuinely represents a natural-language theme.
 * Requires meaningful token overlap; otherwise the theme stays unresolved
 * rather than being silently mapped to an unrelated tag.
 */
export function matchTag<T extends { name: string }>(theme: string, tags: T[]): T | null {
  const themeTokens = tokens(theme)
  if (!themeTokens.length) return null
  let best: { tag: T; score: number } | null = null
  for (const tag of tags) {
    const tagTokens = new Set(tokens(tag.name))
    if (!tagTokens.size) continue
    const overlap = themeTokens.filter((t) => tagTokens.has(t)).length
    const score = overlap / Math.max(themeTokens.length, tagTokens.size)
    if (overlap > 0 && score >= 0.5 && (!best || score > best.score)) best = { tag, score }
  }
  return best?.tag ?? null
}
