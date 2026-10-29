import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GithubIcon } from "@/components/brand/github-icon"
import { AuthDivider, AuthShell } from "@/components/auth/auth-shell"
import { CredentialsForm } from "@/components/auth/credentials-form"
import { Button } from "@/components/ui/button"
import { loginAction } from "@/server/auth/actions"
import { authProviders, signIn } from "@/server/auth/config"
import { safeNext } from "@/server/auth/next"

export const metadata = { title: "Sign in" }

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const redirectTo = safeNext((await searchParams).next)

  return (
    <AuthShell title="Sign in to Outbranch" description="Your projects and research history are saved to your workspace.">
      <div className="space-y-4">
        <CredentialsForm action={loginAction} next={redirectTo} mode="login" />
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href={`/signup?next=${encodeURIComponent(redirectTo)}`} className="font-medium text-foreground underline">
            Create one
          </Link>
        </p>
      </div>

      {(authProviders.github || authProviders.guest) && (
        <div className="space-y-3">
          <AuthDivider>or</AuthDivider>
          {authProviders.github && (
            <form
              action={async () => {
                "use server"
                await signIn("github", { redirectTo })
              }}
            >
              <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
                <GithubIcon /> Continue with GitHub
              </Button>
            </form>
          )}
          {authProviders.guest && (
            <form
              action={async () => {
                "use server"
                await signIn("guest", { redirectTo })
              }}
            >
              <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
                Continue as guest <ArrowRight />
              </Button>
            </form>
          )}
          {authProviders.guest && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Guest sessions get a private workspace that persists in this browser for 30 days.
            </p>
          )}
        </div>
      )}
    </AuthShell>
  )
}
