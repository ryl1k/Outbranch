import { normalizeName } from "@/server/providers/qloo/normalize"

export type ArmEntities = { opportunity: string; entities: string[] }[]

export type ArmMetrics = {
  opportunities: number
  namedEntities: number
  /** Named entities that Qloo independently reports as affinities of the brand's audience. */
  qlooVerifiedEntities: number
  qlooVerifiedRate: number
  /** Opportunities with at least one Qloo-verified entity. */
  opportunitiesWithVerifiedLink: number
  /** Named entities not already present in the confirmed brand profile. */
  novelEntities: number
  noveltyRate: number
  /** Distinct Qloo domains among verified entities. */
  verifiedDomains: number
}

const round = (n: number) => Math.round(n * 1000) / 1000

/**
 * Objective, reproducible metrics for one arm of the Qloo ablation. Matching is
 * by normalized name, so it is conservative: a near-miss spelling counts as unverified.
 */
export function armMetrics(
  arm: ArmEntities,
  qlooAffinities: { name: string; domain: string }[],
  knownProfileNames: string[],
): ArmMetrics {
  const affinity = new Map(qlooAffinities.map((a) => [normalizeName(a.name), a.domain]))
  const known = new Set(knownProfileNames.map(normalizeName))
  let named = 0
  let verified = 0
  let novel = 0
  let withLink = 0
  const domains = new Set<string>()

  for (const opp of arm) {
    const unique = [...new Set(opp.entities.map(normalizeName).filter(Boolean))]
    let linked = false
    for (const name of unique) {
      named++
      if (!known.has(name)) novel++
      const domain = affinity.get(name)
      if (domain) {
        verified++
        domains.add(domain)
        linked = true
      }
    }
    if (linked) withLink++
  }

  return {
    opportunities: arm.length,
    namedEntities: named,
    qlooVerifiedEntities: verified,
    qlooVerifiedRate: named ? round(verified / named) : 0,
    opportunitiesWithVerifiedLink: withLink,
    novelEntities: novel,
    noveltyRate: named ? round(novel / named) : 0,
    verifiedDomains: domains.size,
  }
}
