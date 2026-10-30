"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AuthFormState } from "@/server/auth/actions"

type Props = {
  action: (state: AuthFormState, form: FormData) => Promise<AuthFormState>
  next: string
  mode: "login" | "signup"
}

export function CredentialsForm({ action, next, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const signup = mode === "signup"

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {signup && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" defaultValue={state?.name} key={state?.name} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} key={state?.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={signup ? 8 : undefined}
          required
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
      </Button>
    </form>
  )
}
