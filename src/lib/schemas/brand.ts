import { z } from "zod"

export const ENTITY_KINDS = ["brand", "company", "product", "entertainment_ip", "person", "other"] as const
export const entityKindSchema = z.enum(ENTITY_KINDS)
export type EntityKind = z.infer<typeof entityKindSchema>

export const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
  brand: "Brand",
  company: "Company",
  product: "Product",
  entertainment_ip: "Entertainment IP",
  person: "Person",
  other: "Other",
}

/** Cultural reference categories that map onto Qloo entity types. */
export const CULTURAL_REF_TYPES = [
  "brand",
  "artist",
  "movie",
  "tv_show",
  "videogame",
  "book",
  "podcast",
  "person",
  "place",
  "destination",
] as const

// ---------------------------------------------------------------------------
// Entity resolution (LLM output)
// ---------------------------------------------------------------------------

export const candidateSchema = z.object({
  name: z.string().describe("Official name of the entity"),
  kind: entityKindSchema,
  description: z.string().describe("One sentence that distinguishes this entity from similarly named ones"),
  url: z.string().nullable().describe("Official website if known from the research, else null"),
  parentName: z.string().nullable().describe("Owning company if this is a sub-brand or property, else null"),
})

export const resolutionSchema = z.object({
  candidates: z.array(candidateSchema).describe("Distinct real-world entities the identifier may refer to, best first"),
  ambiguous: z.boolean().describe("True when more than one candidate is a reasonable interpretation"),
  notFound: z.boolean().describe("True when no real, verifiable entity matches the identifier"),
  explanation: z.string().describe("Short reason for the decision, for the user"),
})
export type Resolution = z.infer<typeof resolutionSchema>

// ---------------------------------------------------------------------------
// Brand profile (LLM output)
// ---------------------------------------------------------------------------

export const CLAIM_LLM_STATUSES = ["VERIFIED", "INFERRED", "UNCERTAIN"] as const

export const extractedClaimSchema = z.object({
  topic: z
    .enum(["identity", "products", "audience", "markets", "positioning", "collaborations", "competitors", "culture"])
    .describe("Which part of the profile this supports"),
  statement: z.string().describe("A single factual statement"),
  status: z
    .enum(CLAIM_LLM_STATUSES)
    .describe("VERIFIED only when a listed source directly supports it; INFERRED for reasoning; UNCERTAIN if conflicting"),
  sourceIndex: z.number().int().nullable().describe("Index of the supporting source in the source list, or null"),
})

export const brandProfileExtractionSchema = z.object({
  name: z.string(),
  entityKind: entityKindSchema,
  officialUrl: z.string().nullable(),
  summary: z.string().describe("2-3 sentence neutral description"),
  industry: z.string().nullable(),
  positioning: z.string().nullable().describe("How the entity positions itself culturally and commercially"),
  products: z.array(z.object({ name: z.string(), description: z.string().nullable() })),
  audiences: z.array(z.string()).describe("Audience segments described in plain language"),
  markets: z.array(z.string()).describe("Countries or regions where it operates"),
  competitors: z.array(z.string()),
  collaborations: z.array(
    z.object({ partner: z.string(), description: z.string(), year: z.number().int().nullable() }),
  ),
  culturalRefs: z
    .array(
      z.object({
        name: z.string().describe("Exact name of a real entity (brand, artist, show, game, place...)"),
        type: z.enum(CULTURAL_REF_TYPES),
        why: z.string().describe("How it relates to the brand, grounded in the research"),
      }),
    )
    .describe("Real cultural entities closely associated with the brand: collaborators, ambassadors, IP, scenes"),
  themes: z.array(z.string()).describe("Short natural-language cultural themes, e.g. 'skate culture', 'sustainability'"),
  claims: z.array(extractedClaimSchema),
})
export type BrandProfileExtraction = z.infer<typeof brandProfileExtractionSchema>

// ---------------------------------------------------------------------------
// Stored JSON columns
// ---------------------------------------------------------------------------

export const productListSchema = z.array(z.object({ name: z.string(), description: z.string().nullable() }))
export const stringListSchema = z.array(z.string())
export const collaborationListSchema = z.array(
  z.object({ partner: z.string(), description: z.string(), year: z.number().int().nullable() }),
)
export const culturalRefListSchema = z.array(
  z.object({
    name: z.string(),
    type: z.enum(CULTURAL_REF_TYPES),
    why: z.string(),
    qlooId: z.string().nullable().optional(),
    resolvedName: z.string().nullable().optional(),
    removed: z.boolean().optional(),
  }),
)
export type CulturalRef = z.infer<typeof culturalRefListSchema>[number]
