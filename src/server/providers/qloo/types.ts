import { z } from "zod"

/** Entity types accepted by `filter.type` on /v2/insights (verified against the live API). */
export const QLOO_ENTITY_TYPES = [
  "urn:entity:artist",
  "urn:entity:book",
  "urn:entity:brand",
  "urn:entity:destination",
  "urn:entity:movie",
  "urn:entity:person",
  "urn:entity:place",
  "urn:entity:podcast",
  "urn:entity:tv_show",
  "urn:entity:videogame",
] as const

export type QlooEntityType = (typeof QLOO_ENTITY_TYPES)[number]

export const ENTITY_TYPE_LABELS: Record<QlooEntityType, string> = {
  "urn:entity:artist": "Music artists",
  "urn:entity:book": "Books",
  "urn:entity:brand": "Brands",
  "urn:entity:destination": "Destinations",
  "urn:entity:movie": "Movies",
  "urn:entity:person": "People",
  "urn:entity:place": "Places",
  "urn:entity:podcast": "Podcasts",
  "urn:entity:tv_show": "TV shows",
  "urn:entity:videogame": "Video games",
}

/** /v2/insights returns tags with `id`; /search returns them with `tag_id`. */
const rawTag = z
  .object({ id: z.string().optional(), tag_id: z.string().optional(), name: z.string(), type: z.string().optional() })
  .loose()
  .transform((t) => ({ ...t, id: t.id ?? t.tag_id ?? "" }))
  .refine((t) => t.id.length > 0, "tag without id")

/** An entity as returned by /search, /entities and /v2/insights. Only fields we use are typed. */
export const rawEntitySchema = z
  .object({
    name: z.string(),
    entity_id: z.string(),
    types: z.array(z.string()).optional(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    popularity: z.number().optional(),
    disambiguation: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(rawTag).optional(),
    query: z
      .object({
        affinity: z.number().optional(),
        measurements: z.record(z.string(), z.unknown()).optional(),
        explainability: z.record(z.string(), z.unknown()).optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

export type RawEntity = z.infer<typeof rawEntitySchema>

export const searchResponseSchema = z.object({ results: z.array(rawEntitySchema) }).loose()

export const insightsResponseSchema = z
  .object({
    success: z.boolean().optional(),
    results: z.object({ entities: z.array(rawEntitySchema).default([]) }).loose(),
    query: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()

export const rawTagSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    popularity: z.number().optional(),
    parents: z.array(z.unknown()).optional(),
  })
  .loose()

export const tagsResponseSchema = z
  .object({ results: z.object({ tags: z.array(rawTagSchema).default([]) }).loose() })
  .loose()

export const audiencesResponseSchema = z
  .object({
    results: z
      .object({
        audiences: z
          .array(z.object({ id: z.string(), name: z.string(), type: z.string().optional() }).loose())
          .default([]),
      })
      .loose(),
  })
  .loose()

const compareTagSchema = z
  .object({
    tag_id: z.string(),
    name: z.string(),
    subtype: z.string().optional(),
    popularity: z.number().optional(),
    query: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()

export const compareResponseSchema = z
  .object({
    results: z
      .object({
        tags: z.array(compareTagSchema).default([]),
        a: z.array(compareTagSchema).default([]),
        b: z.array(compareTagSchema).default([]),
      })
      .loose(),
  })
  .loose()

/** Signals and filters we send to /v2/insights. Mirrors documented parameter names. */
export type InsightsParams = {
  "filter.type": QlooEntityType
  "signal.interests.entities"?: string[]
  "signal.interests.tags"?: string[]
  "signal.demographics.audiences"?: string[]
  "signal.demographics.age"?: string
  "signal.location.query"?: string
  "filter.location.query"?: string
  "filter.tags"?: string[]
  "filter.exclude.entities"?: string[]
  "filter.popularity.min"?: number
  "filter.popularity.max"?: number
  "bias.trends"?: "off" | "low" | "medium" | "high"
  "feature.explainability"?: boolean
  take?: number
}
