// Runs as part of `npm run build`. Only Vercel production builds migrate the database, and only over
// Neon's direct connection (DATABASE_URL_UNPOOLED); Prisma Migrate breaks behind the pooler.
import { execSync } from "node:child_process"

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping migrations (not a Vercel production build).")
} else if (!process.env.DATABASE_URL_UNPOOLED) {
  console.error("DATABASE_URL_UNPOOLED is not set; add Neon's direct connection string to Vercel.")
  process.exit(1)
} else {
  execSync("npx prisma migrate deploy", { stdio: "inherit" })
}
