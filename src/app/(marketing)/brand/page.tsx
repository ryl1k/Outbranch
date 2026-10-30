import { Logo, LogoMark } from "@/components/brand/logo"

export const metadata = { title: "Brand system" }

const swatches = [
  ["Burgundy", "#6B112E", "bg-burgundy"],
  ["Porcelain", "#F8F3EE", "bg-porcelain"],
  ["Aubergine", "#1A0E14", "bg-aubergine"],
  ["Rose", "#D89AA8", "bg-rose"],
  ["Sage", "#92A88F", "bg-sage"],
] as const

export default function BrandPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-16">
      <section className="space-y-6">
        <p className="eyebrow">Logo system</p>
        <Logo className="text-6xl" />
        <div className="flex flex-wrap gap-4">
          <div className="grid size-20 place-items-center rounded-2xl bg-aubergine"><LogoMark tone="light" className="size-12" /></div>
          <div className="grid size-20 place-items-center rounded-2xl border bg-card"><LogoMark className="size-12" /></div>
          <div className="grid size-20 place-items-center rounded-2xl bg-burgundy"><LogoMark tone="light" className="size-12" /></div>
          <div className="grid size-20 place-items-center rounded-2xl border bg-card text-aubergine"><LogoMark tone="outline" className="size-12" /></div>
          <div className="grid size-20 place-items-center rounded-2xl border bg-card text-aubergine"><LogoMark tone="mono" className="size-12" /></div>
        </div>
        <div className="theme-dark rounded-2xl bg-background p-8">
          <Logo tone="light" className="text-4xl" />
        </div>
      </section>
      <section className="space-y-4">
        <p className="eyebrow">Color palette — Burgundy First</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {swatches.map(([name, hex, cls]) => (
            <div key={name} className="space-y-2">
              <div className={`h-20 rounded-lg border ${cls}`} />
              <p className="font-mono text-xs">{hex}</p>
              <p className="text-sm">{name}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <p className="eyebrow">Typography</p>
        <h1 className="font-editorial text-6xl">See further. <span className="text-rose-strong italic">Grow smarter.</span></h1>
        <h2 className="text-2xl font-semibold">Manrope interface heading</h2>
        <p className="max-w-prose text-muted-foreground">Inter body copy for scanning dense research.</p>
        <p className="font-mono text-xs">IBM Plex Mono · qloo:entity:4F2A…</p>
      </section>
    </main>
  )
}
