import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { CredentialsForm } from "@/components/auth/credentials-form"
import { signUpAction } from "@/server/auth/actions"
import { safeNext } from "@/server/auth/next"

export const metadata = { title: "Create account" }

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const redirectTo = safeNext((await searchParams).next)

  return (
    <AuthShell title="Create your Outbranch account" description="Your projects and research history are saved to your workspace.">
      <div className="space-y-4">
        <CredentialsForm action={signUpAction} next={redirectTo} mode="signup" />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={`/signin?next=${encodeURIComponent(redirectTo)}`} className="font-medium text-foreground underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
