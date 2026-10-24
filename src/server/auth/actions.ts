"use server"

import { AuthError } from "next-auth"
import { z } from "zod"
import { db } from "@/server/db"
import { hashPassword } from "@/server/auth/password"
import { signIn } from "@/server/auth/config"

export type AuthFormState = { error?: string } | undefined

function safeNext(next: FormDataEntryValue | null) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/projects"
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
})

export async function loginAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const redirectTo = safeNext(form.get("next"))
  try {
    await signIn("password", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo,
    })
  } catch (err) {
    if (err instanceof AuthError) return { error: "Incorrect email or password." }
    throw err // the redirect on success is thrown and must propagate
  }
}

export async function signUpAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const redirectTo = safeNext(form.get("next"))
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || null

  if (await db.user.findUnique({ where: { email: parsed.data.email } })) {
    return { error: "An account with this email already exists." }
  }
  const user = await db.user.create({
    data: { email: parsed.data.email, name, passwordHash: await hashPassword(parsed.data.password) },
  })
  await db.workspace.create({
    data: { name: `${name ?? "My"}'s workspace`, members: { create: { userId: user.id, role: "OWNER" } } },
  })
  return loginAction(undefined, (() => {
    const f = new FormData()
    f.set("email", parsed.data.email)
    f.set("password", parsed.data.password)
    f.set("next", redirectTo)
    return f
  })())
}
