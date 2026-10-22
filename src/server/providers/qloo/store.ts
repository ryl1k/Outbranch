import "server-only"
import type { DataMode } from "@/generated/prisma/client"
import { db } from "@/server/db"
import type { NormalizedEntity } from "./normalize"

/** Upsert a Qloo entity into the private cache and return its internal id. */
export async function upsertQlooEntity(entity: NormalizedEntity, dataMode: DataMode) {
  const data = {
    name: entity.name,
    types: entity.types,
    subtype: entity.subtype,
    popularity: entity.popularity,
    imageUrl: entity.imageUrl,
    // Only a short descriptive subset of properties is retained.
    properties: {
      description: entity.description?.slice(0, 600) ?? null,
      disambiguation: entity.disambiguation,
      tags: entity.tags.slice(0, 12),
    },
    dataMode,
    retrievedAt: new Date(),
  }
  const row = await db.qlooEntity.upsert({
    where: { qlooId: entity.qlooId },
    create: { qlooId: entity.qlooId, ...data },
    update: data,
  })
  return row.id
}

export async function upsertQlooTag(
  tag: { id: string; name: string; type?: string | null },
  dataMode: DataMode,
) {
  const row = await db.qlooTag.upsert({
    where: { qlooId: tag.id },
    create: { qlooId: tag.id, name: tag.name, tagType: tag.type ?? null, dataMode },
    update: { name: tag.name, tagType: tag.type ?? null, retrievedAt: new Date() },
  })
  return row.id
}
