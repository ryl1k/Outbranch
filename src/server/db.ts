import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"
import { PrismaClient } from "@/generated/prisma/client"
import { env } from "./env"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  // DATABASE_URL is Neon's pooled (-pooler) string in production. On Vercel Fluid compute,
  // attachDatabasePool closes idle clients before an instance is suspended; elsewhere it does nothing.
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  attachDatabasePool(pool)
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db
