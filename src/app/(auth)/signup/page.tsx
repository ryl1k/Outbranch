import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { CredentialsForm } from "@/components/auth/credentials-form"
import { signUpAction } from "@/server/auth/actions"

export const metadata = { title: "Create account" }

function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/projects"
}

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const redirectTo = safeNext((await searchParams).next)

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-16 sm:px-12">
      <div className="mx-auto w-full max-w-sm space-y-8">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Create your Outbranch account</h1>
          <p className="text-sm text-muted-foreground">Your projects and research history are saved to your workspace.</p>
        </div>
        <CredentialsForm action={signUpAction} next={redirectTo} mode="signup" />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={`/signin?next=${encodeURIComponent(redirectTo)}`} className="font-medium text-foreground underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
