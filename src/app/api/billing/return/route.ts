import { NextResponse, type NextRequest } from "next/server"
import { isActiveSubscription } from "@/lib/billing"
import { getViewer } from "@/server/auth/session"
import { syncWorkspacePlan } from "@/server/billing/revenuecat"

/** RevenueCat sends the buyer back here; activate the plan, then show the billing page. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer()
  if (!viewer) return NextResponse.redirect(new URL("/signin?next=/settings/billing", request.url))

  let synced = false
  try {
    const plan = await syncWorkspacePlan(viewer.workspace.id)
    synced = isActiveSubscription(plan.subscriptionStatus)
  } catch (error) {
    console.error("[billing] checkout sync failed", error)
  }
  return NextResponse.redirect(new URL(`/settings/billing?checkout=${synced ? "success" : "pending"}`, request.url))
}
