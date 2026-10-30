import { NextResponse, type NextRequest } from "next/server"
import { getViewer } from "@/server/auth/session"
import { syncCheckoutSession } from "@/server/billing/sync"

/** Stripe sends the buyer back here; activate the plan, then show the billing page. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer()
  if (!viewer) return NextResponse.redirect(new URL("/signin?next=/settings/billing", request.url))

  const sessionId = request.nextUrl.searchParams.get("session_id")
  let synced = false
  if (sessionId) {
    try {
      synced = await syncCheckoutSession(sessionId, viewer.workspace.id)
    } catch (error) {
      console.error("[billing] checkout sync failed", error)
    }
  }
  return NextResponse.redirect(new URL(`/settings/billing?checkout=${synced ? "success" : "pending"}`, request.url))
}
