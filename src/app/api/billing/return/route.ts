import { NextResponse, type NextRequest } from "next/server"
import { getViewer } from "@/server/auth/session"
import { syncLatestInvoice } from "@/server/billing/mono"

/** monobank sends the buyer back here; activate the plan, then show the billing page. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer()
  if (!viewer) return NextResponse.redirect(new URL("/signin?next=/settings/billing", request.url))

  let status: string | null = null
  try {
    status = await syncLatestInvoice(viewer.workspace.id)
  } catch (error) {
    console.error("[billing] checkout sync failed", error)
  }
  const checkout = status === "success" ? "success" : status === "failure" ? "failed" : "pending"
  return NextResponse.redirect(new URL(`/settings/billing?checkout=${checkout}`, request.url))
}
