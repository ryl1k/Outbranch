import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { BranchLines } from "@/components/brand/branch-lines"

/** Sign-in and sign-up share one frame: the brand panel on wide screens, the form column everywhere. */
export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="theme-dark relative hidden overflow-hidden bg-background p-12 text-foreground lg:flex lg:flex-col lg:justify-between">
        <BranchLines className="pointer-events-none absolute inset-y-0 right-0 h-full w-[85%] opacity-80" />
        <Link href="/" className="relative">
          <Logo tone="light" className="text-2xl" />
        </Link>
        <div className="relative max-w-md space-y-4">
          <p className="eyebrow text-rose">Cultural intelligence for real growth</p>
          <p className="font-editorial text-5xl leading-[1.05] text-balance">
            One origin. <span className="text-rose italic">Many growth paths.</span>
          </p>
          <p className="text-muted-foreground">
            Research a brand, map its cultural relationships, and turn them into evidence-backed expansion hypotheses.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-5 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <Link href="/" className="inline-block lg:hidden" aria-label="Outbranch home">
            <Logo className="text-2xl" />
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

/** A labelled rule between the email form and the other ways in. */
export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
