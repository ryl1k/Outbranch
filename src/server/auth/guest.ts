import "server-only"
import { createHmac, randomBytes } from "node:crypto"
import { CredentialsSignin } from "next-auth"
import { cookies, headers } from "next/headers"
import { ensurePersonalWorkspace } from "@/server/auth/workspace"
import { db } from "@/server/db"
import { env } from "@/server/env"

const DEVICE_COOKIE = "outbranch-device"
const DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // matches the session lifetime
const IP_WINDOW_MS = 24 * 60 * 60 * 1000

export class GuestLimitError extends CredentialsSignin {
  code = "guest_limit"
}

/** Only keyed hashes are stored, so the table holds no raw IP addresses or device tokens. */
function hash(kind: string, value: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(`${kind}:${value}`).digest("hex")
}

function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown"
}

/**
 * One guest per device: a returning device gets its guest back, so signing out never
 * grants a fresh allowance. New devices are capped per IP, which covers cleared cookies.
 */
export async function resolveGuestUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(DEVICE_COOKIE)?.value
  const cutoff = new Date(Date.now() - DEVICE_TTL_MS)

  if (token) {
    const device = await db.guestDevice.findUnique({ where: { deviceHash: hash("device", token) }, include: { user: true } })
    if (device && device.createdAt >= cutoff) {
      await db.user.update({ where: { id: device.userId }, data: { lastSeenAt: new Date() } })
      return device.user
    }
  }

  const ipHash = hash("ip", clientIp(await headers()))
  const recent = await db.guestDevice.count({
    where: { ipHash, createdAt: { gte: new Date(Date.now() - IP_WINDOW_MS) } },
  })
  if (recent >= env.GUEST_SIGNUPS_PER_IP_PER_DAY) throw new GuestLimitError()

  const newToken = randomBytes(32).toString("base64url")
  const user = await db.user.create({ data: { name: "Guest researcher", isGuest: true } })
  await ensurePersonalWorkspace(user.id, "Guest")
  await db.guestDevice.create({ data: { deviceHash: hash("device", newToken), ipHash, userId: user.id } })
  await db.guestDevice.deleteMany({ where: { createdAt: { lt: cutoff } } })

  cookieStore.set(DEVICE_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_TTL_MS / 1000,
  })
  return user
}
