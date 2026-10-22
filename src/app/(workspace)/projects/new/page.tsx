import { BranchLines } from "@/components/brand/branch-lines"
import { BrandInputForm } from "@/components/research/brand-input-form"

export const metadata = { title: "New research" }

const STEPS = [
  ["Research", "We identify the entity and build a sourced brand profile."],
  ["Verify", "You confirm or correct the profile before anything else runs."],
  ["Discover", "Qloo cultural signals become evidence-backed opportunities."],
] as const

export default function NewProjectPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_320px] lg:py-16">
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="eyebrow">New research</p>
          <h1 className="font-editorial text-4xl leading-tight text-balance sm:text-5xl">
            Where could your brand <span className="text-rose-strong italic">grow next?</span>
          </h1>
        </div>
        <BrandInputForm />
      </div>

      <aside className="theme-dark relative hidden self-start overflow-hidden rounded-2xl bg-background p-6 text-foreground lg:block">
        <BranchLines className="pointer-events-none absolute -right-24 -bottom-10 h-64 w-[140%] opacity-50" />
        <p className="eyebrow relative text-rose">How it works</p>
        <ol className="relative mt-5 space-y-5">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-rose/40 font-mono text-[11px] text-rose">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
