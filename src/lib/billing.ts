/** Plan definitions shared by the server checks and the pricing UI. */
export const PRO_PRICE_USD = 100

export const FREE_LIMITS = {
  projects: 2,
  deepDives: 5,
} as const

/** Guests sign in without an account, so they get less than a free account. */
export const GUEST_PROJECT_LIMIT = 1

export const PRO_FEATURES = [
  "Unlimited research projects",
  "Unlimited deep dives",
  "Reports, comparisons and Markdown export",
  "Qloo-backed cultural network for every project",
] as const

export const FREE_FEATURES = [
  `Up to ${FREE_LIMITS.projects} research projects`,
  `Up to ${FREE_LIMITS.deepDives} deep dives`,
  "Explore the read-only showcase study",
  "Reports and Markdown export",
] as const

/** Stripe subscription states that grant the paid plan. */
const ACTIVE_STATUSES = new Set(["active", "trialing"])

export function isActiveSubscription(status: string | null | undefined) {
  return status != null && ACTIVE_STATUSES.has(status)
}
