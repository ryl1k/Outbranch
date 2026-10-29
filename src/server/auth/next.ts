/** Where to send someone after signing in: only same-site paths, never `//host` or absolute URLs. */
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/projects"
}
