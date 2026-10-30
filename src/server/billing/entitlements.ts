import "server-only"
import { FREE_LIMITS, GUEST_PROJECT_LIMIT, isActiveSubscription } from "@/lib/billing"
import { db } from "@/server/db"

/** Raised when a free workspace hits a plan limit. Surfaces to the UI with an upgrade prompt. */
export class PaywallError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PaywallError"
  }
}

/** Deep dives that count toward the free allowance; failed and cancelled runs do not. */
const COUNTED_DEEP_DIVE_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "PARTIAL"] as const

export async function getBillingState(workspaceId: string, { isGuest = false } = {}) {
  const [workspace, projects, deepDives] = await Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { subscriptionStatus: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    db.project.count({ where: { workspaceId } }),
    db.researchJob.count({
      where: { project: { workspaceId }, kind: "DEEP_DIVE", status: { in: [...COUNTED_DEEP_DIVE_STATUSES] } },
    }),
  ])
  return {
    subscribed: isActiveSubscription(workspace.subscriptionStatus),
    status: workspace.subscriptionStatus,
    currentPeriodEnd: workspace.currentPeriodEnd,
    cancelAtPeriodEnd: workspace.cancelAtPeriodEnd,
    hasCustomer: workspace.subscriptionStatus !== null,
    usage: { projects, deepDives },
    limits: { ...FREE_LIMITS, projects: isGuest ? GUEST_PROJECT_LIMIT : FREE_LIMITS.projects },
  }
}

export async function assertCanCreateProject(workspaceId: string, { isGuest = false } = {}) {
  const state = await getBillingState(workspaceId, { isGuest })
  if (state.subscribed) return
  if (isGuest && state.usage.projects >= GUEST_PROJECT_LIMIT) {
    throw new PaywallError(
      `Guest workspaces include ${GUEST_PROJECT_LIMIT} research project. Create a free account for ${FREE_LIMITS.projects}, or delete this one to start another.`,
    )
  }
  if (state.usage.projects >= FREE_LIMITS.projects) {
    throw new PaywallError(
      `The free plan includes ${FREE_LIMITS.projects} research projects. Upgrade to Pro for unlimited projects, or delete one to free a slot.`,
    )
  }
}

export async function assertCanStartDeepDive(workspaceId: string) {
  const state = await getBillingState(workspaceId)
  if (state.subscribed) return
  if (state.usage.deepDives >= FREE_LIMITS.deepDives) {
    throw new PaywallError(`The free plan includes ${FREE_LIMITS.deepDives} deep dives. Upgrade to Pro for unlimited deep research.`)
  }
}

/** What the workspace has produced, all time and over the last 30 days, for the billing page. */
export async function getWorkspaceActivity(workspaceId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const project = { workspaceId }
  const count = (createdAt?: { gte: Date }) =>
    Promise.all([
      db.project.count({ where: { workspaceId, createdAt } }),
      db.researchJob.count({ where: { project, kind: "DISCOVERY", status: { in: ["SUCCEEDED", "PARTIAL"] }, createdAt } }),
      db.researchJob.count({ where: { project, kind: "DEEP_DIVE", status: { in: [...COUNTED_DEEP_DIVE_STATUSES] }, createdAt } }),
      db.report.count({ where: { project, createdAt } }),
      db.opportunity.count({ where: { project, createdAt } }),
    ])
  const [total, recent] = await Promise.all([count(), count({ gte: since })])
  const keys = ["projects", "studies", "deepDives", "reports", "opportunities"] as const
  return Object.fromEntries(keys.map((k, i) => [k, { total: total[i], recent: recent[i] }])) as Record<
    (typeof keys)[number],
    { total: number; recent: number }
  >
}
