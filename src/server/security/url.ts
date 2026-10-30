import { isIP } from "node:net"

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string }

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"])
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"]

function isPrivateIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIPv6(ip: string) {
  const v = ip.toLowerCase()
  return (
    v === "::" ||
    v === "::1" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe80") ||
    v.startsWith("::ffff:")
  )
}

/**
 * Validate a user-supplied website before it is used anywhere in research.
 * Only public http(s) hosts on default ports are accepted; IP literals,
 * internal names and credentials in URLs are rejected (SSRF protection).
 */
export function checkPublicUrl(input: string): UrlCheck {
  const raw = input.trim()
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return { ok: false, reason: "Not a valid URL" }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "Only http(s) URLs are allowed" }
  if (url.username || url.password) return { ok: false, reason: "URLs with credentials are not allowed" }
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "Non-standard ports are not allowed" }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  const ipVersion = isIP(host)
  if (ipVersion === 4 && isPrivateIPv4(host)) return { ok: false, reason: "Private network addresses are not allowed" }
  if (ipVersion === 6 && isPrivateIPv6(host)) return { ok: false, reason: "Private network addresses are not allowed" }
  if (ipVersion) return { ok: false, reason: "Use a domain name rather than an IP address" }
  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "Internal hostnames are not allowed" }
  }
  if (!host.includes(".")) return { ok: false, reason: "Use a public domain name" }

  url.hash = ""
  return { ok: true, url }
}
