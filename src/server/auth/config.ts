import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import { db } from "@/server/db"
import { env } from "@/server/env"
import { z } from "zod"
import { verifyPassword } from "@/server/auth/password"
import { ensurePersonalWorkspace } from "@/server/auth/workspace"
import { assertLoginBudget, recordLoginFailure } from "@/server/security/rate-limit"

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

// The max bounds the scrypt work an anonymous request can trigger.
const passwordCredentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) })

providers.push(
  Credentials({
    id: "password",
    name: "Email and password",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = passwordCredentials.safeParse(raw)
      if (!parsed.success) return null
      if (!(await assertLoginBudget(parsed.data.email))) return null
      const user = await db.user.findUnique({ where: { email: parsed.data.email } })
      if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        await recordLoginFailure(parsed.data.email)
        return null
      }
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
          // GitHub has verified this email; sign-up has not. Dropping a password set on an
          // unverified sign-up stops anyone who registered the address first from keeping access.
          update: { name: user.name, image: user.image, lastSeenAt: new Date(), passwordHash: null },
          create: { email: user.email, name: user.name, image: user.image },
        })
        await ensurePersonalWorkspace(dbUser.id, dbUser.name)
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
