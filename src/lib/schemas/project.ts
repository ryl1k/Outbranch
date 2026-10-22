import { z } from "zod"

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  )

export const BUDGET_RANGES = ["under_50k", "50k_250k", "250k_1m", "over_1m", "undecided"] as const
export const BUDGET_LABELS: Record<(typeof BUDGET_RANGES)[number], string> = {
  under_50k: "Under $50k",
  "50k_250k": "$50k – $250k",
  "250k_1m": "$250k – $1M",
  over_1m: "Over $1M",
  undecided: "Undecided",
}

/** Optional context the user may provide. Stored on Project.userContext. */
export const userContextSchema = z.object({
  products: optionalText(600),
  industry: optionalText(120),
  targetMarket: optionalText(300),
  objectives: optionalText(600),
  constraints: optionalText(600),
  excludedCategories: optionalText(300),
  budgetRange: z.enum(BUDGET_RANGES).optional(),
})
export type UserContext = z.infer<typeof userContextSchema>

export const createProjectSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(2, "Enter a brand, company, product, IP, website or short description")
    .max(500),
  context: userContextSchema.default({}),
})
export type CreateProjectInput = z.input<typeof createProjectSchema>

const URL_LIKE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i

export type IdentifierKind = "url" | "description" | "name"

/** Classify what the user typed so research can start from the right place. */
export function classifyIdentifier(identifier: string): IdentifierKind {
  const value = identifier.trim()
  if (URL_LIKE.test(value) && !value.includes(" ")) return "url"
  if (value.split(/\s+/).length > 8) return "description"
  return "name"
}

/** A short project name derived from the identifier. */
export function projectNameFrom(identifier: string): string {
  const value = identifier.trim()
  if (classifyIdentifier(value) === "url") {
    const host = value.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]
    return host.replace(/^www\./i, "")
  }
  return value.length > 60 ? `${value.slice(0, 57)}…` : value
}
