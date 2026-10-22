import type { ClaimStatus, EvidenceStrength } from "@/generated/prisma/enums"

/**
 * A model may only call a claim VERIFIED when it cites a source we actually
 * retrieved. Anything else is downgraded so the UI never overstates certainty.
 */
export function classifyClaim(
  llmStatus: "VERIFIED" | "INFERRED" | "UNCERTAIN",
  sourceIndex: number | null,
  sourceCount: number,
): { status: ClaimStatus; sourceIndex: number | null } {
  const validSource = sourceIndex !== null && sourceIndex >= 0 && sourceIndex < sourceCount
  if (llmStatus === "VERIFIED") {
    return validSource ? { status: "VERIFIED", sourceIndex } : { status: "INFERRED", sourceIndex: null }
  }
  return { status: llmStatus, sourceIndex: validSource ? sourceIndex : null }
}

/**
 * Evidence strength is derived from what was actually collected, not from model
 * confidence: count of Qloo relationships and independently sourced claims.
 */
export function deriveEvidenceStrength(input: {
  qlooRelationships: number
  verifiedClaims: number
  contradictingClaims: number
}): EvidenceStrength {
  const { qlooRelationships, verifiedClaims, contradictingClaims } = input
  if (qlooRelationships === 0 && verifiedClaims === 0) return "INSUFFICIENT"
  let score = Math.min(qlooRelationships, 4) + Math.min(verifiedClaims, 4) * 1.5 - contradictingClaims * 2
  if (qlooRelationships === 0 || verifiedClaims === 0) score = Math.min(score, 3.5)
  if (score >= 7) return "STRONG"
  if (score >= 4) return "MODERATE"
  if (score > 0) return "LIMITED"
  return "INSUFFICIENT"
}
