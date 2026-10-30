"use client"

/**
 * A script the browser runs while parsing the server HTML, before first paint. On the client it renders
 * as inert text/plain so React does not warn about script tags (see Next's "preventing flash" guide).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
