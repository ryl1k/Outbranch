import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]

/** Optimistic check only — real authorization happens in the server data layer. */
export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))
  if (!hasSession) {
    const url = new URL("/signin", request.url)
    url.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/projects/:path*", "/settings/:path*"],
}
