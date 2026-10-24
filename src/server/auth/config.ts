import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import { db } from "@/server/db"
import { env } from "@/server/env"
import { verifyPassword } from "@/server/auth/password"
import { z } from "zod"

async function ensurePersonalWorkspace(userId: string, label: string) {
  const existing = await db.workspaceMember.findFirst({ where: { userId } })
  if (existing) return existing.workspaceId
  const workspace = await db.workspace.create({
    data: { name: `${label}'s workspace`, members: { create: { userId, role: "OWNER" } } },
  })
  return workspace.id
}

const providers: NextAuthConfig["providers"] = []

if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET }))
}

if (env.AUTH_ENABLE_GUEST) {
  providers.push(
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      // A guest gets a fresh private workspace; nothing is shared between guests.
      async authorize() {
        const user = await db.user.create({ data: { name: "Guest researcher", isGuest: true } })
        await ensurePersonalWorkspace(user.id, "Guest")
        return { id: user.id, name: user.name }
      },
    }),
  )
}

const passwordCredentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) })

providers.push(
  Credentials({
    id: "password",
    name: "Email and password",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = passwordCredentials.safeParse(raw)
      if (!parsed.success) return null
      const user = await db.user.findUnique({ where: { email: parsed.data.email } })
      if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) return null
      await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      return { id: user.id, name: user.name, email: user.email }
    },
  }),
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "github" && user?.email) {
        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: { name: user.name, image: user.image, lastSeenAt: new Date() },
          create: { email: user.email, name: user.name, image: user.image },
        })
        await ensurePersonalWorkspace(dbUser.id, dbUser.name ?? "My")
        token.uid = dbUser.id
      } else if (user?.id) {
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid
      return session
    },
  },
})

export const authProviders = {
  github: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
  guest: env.AUTH_ENABLE_GUEST,
}
