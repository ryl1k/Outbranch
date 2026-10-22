import { describe, expect, it } from "vitest"
import { classifyIdentifier, projectNameFrom } from "@/lib/schemas/project"
import { classifyClaim, deriveEvidenceStrength } from "@/server/research/evidence"
import { checkPublicUrl } from "@/server/security/url"

describe("checkPublicUrl (SSRF guard)", () => {
  it.each(["liquiddeath.com", "https://www.nike.com/about", "http://example.org"])("accepts %s", (u) => {
    expect(checkPublicUrl(u).ok).toBe(true)
  })

  it.each([
    ["http://localhost:3000", "Non-standard ports"],
    ["http://127.0.0.1", "Private"],
    ["http://169.254.169.254/latest/meta-data", "Private"],
    ["http://10.0.0.5", "Private"],
    ["http://[::1]/", "Private"],
    ["https://8.8.8.8", "IP address"],
    ["http://intranet.corp", "Internal"],
    ["https://user:pass@example.com", "credentials"],
    ["ftp://example.com", "http(s)"],
    ["file:///etc/passwd", "http(s)"],
    ["https://metadata.google.internal", "Internal"],
  ])("rejects %s", (u, reason) => {
    const res = checkPublicUrl(u)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toContain(reason)
  })
})

describe("classifyIdentifier", () => {
  it("distinguishes urls, names and descriptions", () => {
    expect(classifyIdentifier("https://liquiddeath.com")).toBe("url")
    expect(classifyIdentifier("liquiddeath.com")).toBe("url")
    expect(classifyIdentifier("Liquid Death")).toBe("name")
    expect(classifyIdentifier("a small Portuguese brand making canned sardines with illustrated retro packaging")).toBe(
      "description",
    )
  })

  it("derives readable project names", () => {
    expect(projectNameFrom("https://www.liquiddeath.com/about")).toBe("liquiddeath.com")
    expect(projectNameFrom("Stranger Things")).toBe("Stranger Things")
  })
})

describe("classifyClaim", () => {
  it("keeps VERIFIED only with a valid retrieved source", () => {
    expect(classifyClaim("VERIFIED", 1, 3)).toEqual({ status: "VERIFIED", sourceIndex: 1 })
    expect(classifyClaim("VERIFIED", null, 3)).toEqual({ status: "INFERRED", sourceIndex: null })
    expect(classifyClaim("VERIFIED", 7, 3)).toEqual({ status: "INFERRED", sourceIndex: null })
  })

  it("never upgrades inferred or uncertain claims", () => {
    expect(classifyClaim("INFERRED", 0, 3).status).toBe("INFERRED")
    expect(classifyClaim("UNCERTAIN", 0, 3).status).toBe("UNCERTAIN")
  })
})

describe("deriveEvidenceStrength", () => {
  it("is insufficient with no evidence at all", () => {
    expect(deriveEvidenceStrength({ qlooRelationships: 0, verifiedClaims: 0, contradictingClaims: 0 })).toBe(
      "INSUFFICIENT",
    )
  })

  it("requires both cultural and commercial evidence to be strong", () => {
    expect(deriveEvidenceStrength({ qlooRelationships: 4, verifiedClaims: 0, contradictingClaims: 0 })).toBe("LIMITED")
    expect(deriveEvidenceStrength({ qlooRelationships: 3, verifiedClaims: 3, contradictingClaims: 0 })).toBe("STRONG")
    expect(deriveEvidenceStrength({ qlooRelationships: 2, verifiedClaims: 1, contradictingClaims: 0 })).toBe(
      "LIMITED",
    )
  })

  it("penalises contradicting evidence", () => {
    expect(deriveEvidenceStrength({ qlooRelationships: 3, verifiedClaims: 3, contradictingClaims: 2 })).toBe("LIMITED")
  })
})
