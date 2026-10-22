import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GithubIcon } from "@/components/brand/github-icon"
import { Logo } from "@/components/brand/logo"
import { BranchLines } from "@/components/brand/branch-lines"
import { Button } from "@/components/ui/button"
import { authProviders, signIn } from "@/server/auth/config"

export const metadata = { title: "Sign in" }

function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/projects"
}

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const redirectTo = safeNext((await searchParams).next)

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="theme-dark relative hidden overflow-hidden bg-background p-12 text-foreground lg:flex lg:flex-col lg:justify-between">
        <BranchLines className="pointer-events-none absolute inset-y-0 right-0 h-full w-[85%] opacity-80" />
        <Link href="/" className="relative">
          <Logo tone="light" className="text-2xl" />
        </Link>
        <div className="relative max-w-md space-y-4">
          <p className="eyebrow text-rose">Cultural intelligence for real growth</p>
          <h1 className="font-editorial text-5xl leading-[1.05] text-balance">
            One origin. <span className="text-rose italic">Many growth paths.</span>
          </h1>
          <p className="text-muted-foreground">
            Research a brand, map its cultural relationships, and turn them into evidence-backed
            expansion hypotheses.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <Link href="/" className="lg:hidden">
            <Logo className="text-2xl" />
          </Link>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Sign in to Outbranch</h2>
            <p className="text-sm text-muted-foreground">
              Your projects and research history are saved to your workspace.
            </p>
          </div>

          <div className="space-y-3">
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
                <Button type="submit" size="lg" className="h-11 w-full">
                  Continue as guest <ArrowRight />
                </Button>
              </form>
            )}
            {!authProviders.github && !authProviders.guest && (
              <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
                No sign-in method is configured. Set AUTH_GITHUB_ID/SECRET or AUTH_ENABLE_GUEST.
              </p>
            )}
          </div>

          {authProviders.guest && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Guest sessions get a private workspace that persists in this browser for 30 days.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
