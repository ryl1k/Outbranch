import type { AnalysisConstraints } from "@/generated/prisma/client"
import { OPPORTUNITY_CATEGORIES, RISK_APPETITES, type AnalysisConfig, type OpportunityCategory } from "@/lib/schemas/discovery"

/** Turn a stored constraints row into form defaults for a refinement. */
export function constraintsToConfig(c: AnalysisConstraints | null): Partial<AnalysisConfig> {
  if (!c) return {}
  return {
    focusCategories: c.focusCategories.filter((x): x is OpportunityCategory =>
      (OPPORTUNITY_CATEGORIES as readonly string[]).includes(x),
    ),
    excludedCategories: c.excludedCategories,
    regions: c.regions,
    objectives: c.objectives ?? undefined,
    budgetRange: c.budgetRange ?? undefined,
    riskAppetite: (RISK_APPETITES as readonly string[]).includes(c.riskAppetite ?? "")
      ? (c.riskAppetite as AnalysisConfig["riskAppetite"])
      : undefined,
    notes: c.notes ?? undefined,
  }
}
