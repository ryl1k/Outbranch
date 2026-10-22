import { z } from "zod"

export const OPPORTUNITY_CATEGORIES = [
  "PRODUCT_CATEGORY",
  "PARTNERSHIP",
  "COLLABORATION",
  "LICENSING",
  "AUDIENCE",
  "GEOGRAPHIC",
  "EXPERIENTIAL",
  "ADJACENT_MARKET",
] as const
export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  PRODUCT_CATEGORY: "New product category",
  PARTNERSHIP: "Strategic partnership",
  COLLABORATION: "Brand collaboration",
  LICENSING: "Licensing & merchandise",
  AUDIENCE: "New audience",
  GEOGRAPHIC: "Geographic expansion",
  EXPERIENTIAL: "Entertainment & experiences",
  ADJACENT_MARKET: "Adjacent market",
}

export const RISK_APPETITES = ["low", "medium", "high"] as const

// ---------------------------------------------------------------------------
// Analysis configuration (user input)
// ---------------------------------------------------------------------------

export const analysisConfigSchema = z.object({
  focusCategories: z.array(z.enum(OPPORTUNITY_CATEGORIES)).max(8).default([]),
  excludedCategories: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  regions: z.array(z.string().trim().min(2).max(60)).max(3).default([]),
  objectives: z.string().trim().max(600).optional(),
  budgetRange: z.string().max(40).optional(),
  riskAppetite: z.enum(RISK_APPETITES).optional(),
  notes: z.string().trim().max(600).optional(),
})
export type AnalysisConfig = z.infer<typeof analysisConfigSchema>
export type AnalysisConfigInput = z.input<typeof analysisConfigSchema>

// ---------------------------------------------------------------------------
// Domain planning (LLM output)
// ---------------------------------------------------------------------------

export const PLANNABLE_DOMAINS = [
  "urn:entity:brand",
  "urn:entity:artist",
  "urn:entity:movie",
  "urn:entity:tv_show",
  "urn:entity:videogame",
  "urn:entity:book",
  "urn:entity:podcast",
  "urn:entity:person",
  "urn:entity:destination",
  "urn:entity:place",
] as const

export const domainPlanSchema = z.object({
  domains: z
    .array(
      z.object({
        type: z.enum(PLANNABLE_DOMAINS),
        rationale: z.string().describe("Why this domain could reveal a commercial opportunity for this brand"),
      }),
    )
    .describe("3 to 6 Qloo entity domains worth querying, most useful first"),
})
export type DomainPlan = z.infer<typeof domainPlanSchema>

// ---------------------------------------------------------------------------
// Cultural insights (LLM output)
// ---------------------------------------------------------------------------

export const culturalInsightGenerationSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      summary: z.string().describe("What the cluster of relationships says about the brand's audience taste"),
      domain: z.string(),
      evidence: z.array(z.string()).describe("Relationship aliases (R#) that support this insight"),
    }),
  ),
})

// ---------------------------------------------------------------------------
// Opportunity generation (LLM output)
// ---------------------------------------------------------------------------

export const generatedOpportunitySchema = z.object({
  title: z.string().describe("Specific, concrete title (max ~10 words)"),
  category: z.enum(OPPORTUNITY_CATEGORIES),
  summary: z.string().describe("One or two sentences"),
  hypothesis: z.string().describe("The expansion hypothesis, stated so it can be tested"),
  mechanism: z.string().describe("How this would generate revenue: who pays whom, for what"),
  culturalEvidence: z.array(z.string()).describe("Aliases R# / I# of Qloo relationships or insights that support it"),
  brandEvidence: z.array(z.string()).describe("Aliases S# of brand claims that support it"),
  partners: z.array(
    z.object({
      name: z.string(),
      role: z.string().describe("What this partner would contribute"),
      alias: z.string().nullable().describe("R# alias if the partner appears in the Qloo evidence, else null"),
    }),
  ),
  risks: z.array(z.string()),
  unknowns: z.array(z.string()).describe("What must be validated before committing"),
  nextAction: z.string().describe("The single most useful next step"),
})
export const opportunityGenerationSchema = z.object({ opportunities: z.array(generatedOpportunitySchema) })
export type GeneratedOpportunity = z.infer<typeof generatedOpportunitySchema>

export const partnerListSchema = z.array(
  z.object({
    name: z.string(),
    role: z.string(),
    qlooEntityId: z.string().nullable().optional(),
    status: z.literal("proposed").default("proposed"),
  }),
)
export type ProposedPartner = z.infer<typeof partnerListSchema>[number]

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export const CRITERIA = [
  "culturalRelevance",
  "strategicFit",
  "businessModelClarity",
  "commercialPotential",
  "differentiation",
  "feasibility",
  "risk",
  "uncertainty",
] as const
export type Criterion = (typeof CRITERIA)[number]

export const CRITERIA_LABELS: Record<Criterion, string> = {
  culturalRelevance: "Cultural relevance",
  strategicFit: "Strategic fit",
  businessModelClarity: "Business model clarity",
  commercialPotential: "Commercial potential",
  differentiation: "Competitive differentiation",
  feasibility: "Feasibility",
  risk: "Risk",
  uncertainty: "Uncertainty",
}

/** For these criteria a higher level is worse. */
export const NEGATIVE_CRITERIA: readonly Criterion[] = ["risk", "uncertainty"]

export const LEVELS = ["very_low", "low", "medium", "high", "very_high"] as const
export type Level = (typeof LEVELS)[number]

export const criterionAssessmentSchema = z.object({
  level: z.enum(LEVELS),
  rationale: z.string().describe("One or two sentences grounded in the cited evidence"),
  basis: z
    .enum(["MEASURED", "MODEL_ASSESSED", "UNAVAILABLE"])
    .describe("MEASURED only when directly backed by Qloo data or a sourced figure; UNAVAILABLE if no evidence"),
})
export type CriterionAssessment = z.infer<typeof criterionAssessmentSchema>

export const evaluationGenerationSchema = z.object({
  evaluations: z.array(
    z.object({
      alias: z.string().describe("Opportunity alias O#"),
      criteria: z.object(
        Object.fromEntries(CRITERIA.map((c) => [c, criterionAssessmentSchema])) as Record<
          Criterion,
          typeof criterionAssessmentSchema
        >,
      ),
    }),
  ),
})
export type EvaluationCriteria = Record<Criterion, CriterionAssessment>
export const evaluationCriteriaSchema = z.object(
  Object.fromEntries(CRITERIA.map((c) => [c, criterionAssessmentSchema])) as Record<
    Criterion,
    typeof criterionAssessmentSchema
  >,
)

// ---------------------------------------------------------------------------
// Commercial investigation (LLM output)
// ---------------------------------------------------------------------------

export const commercialFindingsSchema = z.object({
  competitors: z.array(z.object({ name: z.string(), note: z.string() })),
  potentialPartners: z.array(z.object({ name: z.string(), note: z.string() })),
  existingExamples: z.array(z.string()).describe("Comparable launches, collaborations or deals that already happened"),
  marketConditions: z.string(),
  costs: z.string().describe("Cost drivers and any sourced figures; say 'not established' when unknown"),
  licensing: z.string().describe("Licensing or IP considerations, or 'not applicable'"),
  dependencies: z.array(z.string()),
  uncertainties: z.array(z.string()),
  claims: z.array(
    z.object({
      statement: z.string(),
      status: z.enum(["VERIFIED", "INFERRED", "UNCERTAIN"]),
      sourceIndex: z.number().int().nullable(),
      stance: z.enum(["SUPPORTS", "CONTRADICTS", "CONTEXT"]),
    }),
  ),
})
export type CommercialFindings = z.infer<typeof commercialFindingsSchema>

// ---------------------------------------------------------------------------
// Deep dive (LLM output)
// ---------------------------------------------------------------------------

export const deepDiveSchema = z.object({
  executiveSummary: z.string().describe("4-6 sentences a business development lead can act on"),
  marketResearch: z.string().describe("What the research says about the market; cite figures only if present in the evidence"),
  competitiveLandscape: z.string(),
  financialAssumptions: z.array(
    z.object({
      assumption: z.string(),
      basis: z.enum(["SOURCED", "ESTIMATE", "UNKNOWN"]).describe("SOURCED only when a figure appears in the evidence"),
      note: z.string(),
    }),
  ),
  validationStrategy: z.array(
    z.object({
      step: z.string(),
      successSignal: z.string().describe("Observable result that would confirm the hypothesis"),
      effort: z.enum(["low", "medium", "high"]),
    }),
  ),
  nextSteps: z.array(z.string()).describe("Concrete actions for the next 30-90 days; none require committing money without approval"),
  keyRisks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
})
export type DeepDive = z.infer<typeof deepDiveSchema>
