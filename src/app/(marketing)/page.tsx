import Link from "next/link"
import { ArrowRight, BadgeCheck, CircleHelp, Compass, Lightbulb, Radar, Sprout } from "lucide-react"
import { BranchLines } from "@/components/brand/branch-lines"
import { GithubIcon } from "@/components/brand/github-icon"
import { Logo } from "@/components/brand/logo"
import { HeroFlow } from "@/components/marketing/hero-flow"
import { SignalPreview } from "@/components/marketing/signal-preview"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: { absolute: "Outbranch — See further. Grow smarter." },
}

const REPO_URL = "https://github.com/ryl1k/outbranch"

const PILLARS = [
  { icon: Radar, title: "Explore", body: "Find the scenes, audiences and markets your customers already gravitate to." },
  { icon: Compass, title: "Connect", body: "See which brands, artists and properties share their taste, with the evidence." },
  { icon: Sprout, title: "Grow", body: "Turn those relationships into hypotheses with a real way to make money." },
]

const STEPS = [
  ["Name a brand", "A brand, company, product, entertainment IP, website or a sentence about the business."],
  ["Research it", "Outbranch reads public sources and builds a profile where every claim shows its source."],
  ["Confirm it", "You correct anything wrong. Nothing runs on a profile you have not confirmed."],
  ["Map the culture", "Qloo's Taste AI finds the brands, artists, shows, games and places your audience shares taste with."],
  ["Form hypotheses", "Claude turns the strongest relationships into expansion ideas, each with a commercial mechanism."],
  ["Test the case", "The top ideas get web research on competitors, costs, licensing and precedent, then a ranked evaluation."],
]

const CRITERIA = [
  ["Cultural relevance", "Is the audience overlap real, and what drives it?"],
  ["Strategic fit", "Does it extend what the brand already stands for?"],
  ["Business model clarity", "Who pays whom, and for what?"],
  ["Commercial potential", "Is there a market large enough to matter?"],
  ["Differentiation", "Would this stand out against what already exists?"],
  ["Feasibility", "Can the brand actually deliver it?"],
  ["Risk and uncertainty", "What could go wrong, and what is still unknown?"],
]

const USE_CASES = [
  ["Consumer brands", "Find the next category, collaboration or market before a competitor does."],
  ["Entertainment IP owners", "Find licensing, merchandise and experience partners whose fans already overlap with yours."],
  ["Strategy and growth teams", "Replace a week of desk research with a sourced, ranked shortlist you can challenge."],
  ["Agencies and licensing teams", "Bring clients partnership ideas backed by cultural data, not instinct."],
]

const FEATURES = [
  ["Evidence you can trace", "Every claim links to its source, and every cultural relationship records the Qloo query and date that produced it."],
  ["Honest about uncertainty", "Verified facts, your input, AI inference and open questions are labelled differently everywhere."],
  ["An explorable network", "Follow any opportunity back through the cultural entities that support it to the brand itself."],
  ["Side-by-side comparison", "Compare directions on cultural, business and assessment criteria, with gaps shown as gaps."],
  ["Refine without starting over", "Focus on a region, exclude a category or change your risk appetite. Completed research is reused."],
  ["Reports for the team", "Share a printable brief or export Markdown with sources and limitations included."],
]

function Nav() {
  return (
    <header className="relative z-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-8" aria-label="Main">
        <Link href="/" aria-label="Outbranch home">
          <Logo tone="light" className="text-xl" />
        </Link>
        <div className="hidden items-center gap-8 text-sm text-ivory/70 md:flex">
          <a href="#how-it-works" className="hover:text-ivory">How it works</a>
          <a href="#evaluation" className="hover:text-ivory">Evaluation</a>
          <a href="#use-cases" className="hover:text-ivory">Use cases</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="hidden px-3 text-sm text-ivory/70 hover:text-ivory sm:block">Sign in</Link>
          <Button asChild className="rounded-full">
            <Link href="/projects/new">Explore opportunities</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}

export default function LandingPage() {
  return (
    <div className="bg-porcelain">
      <section className="theme-dark relative overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgb(107_17_46/0.45),transparent_60%)]" aria-hidden />
        <Nav />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-8 pb-20 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-16 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="font-editorial text-[clamp(3.25rem,7vw,6rem)] leading-[0.98] text-ivory">
              See further.
              <br />
              <span className="text-rose">Grow smarter.</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-ivory/75">
              Outbranch transforms cultural intelligence into real growth opportunities for your brand, company, or IP.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link href="/projects/new">
                  Explore opportunities <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-ivory/25 bg-transparent px-6 text-base text-ivory hover:bg-ivory/10 hover:text-ivory">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>
          <HeroFlow />
        </div>
        <div className="relative border-t border-ivory/10">
          <ul className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-8">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-rose/30 bg-burgundy/40">
                  <Icon className="size-5 text-rose" />
                </span>
                <div>
                  <p className="font-heading font-semibold text-ivory">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/65">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <h2 className="font-editorial text-4xl leading-tight text-balance text-aubergine sm:text-5xl">
            Cultural data tells you who your audience is. Outbranch tells you what to do about it.
          </h2>
          <div className="space-y-8 text-lg leading-relaxed text-aubergine/80">
            <p>
              Taste is connected. People who love a brand also love particular artists, shows, games, places and other brands.
              Those connections point to partners, products and markets a brand has not considered yet.
            </p>
            <dl className="grid gap-6 border-t border-aubergine/10 pt-8 text-base sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-2 font-heading font-semibold text-aubergine"><span className="size-2 rounded-full bg-rose-strong" /> Cultural signals</dt>
                <dd className="mt-2 text-sm text-aubergine/70">Taste affinities from Qloo, each tied to the query that produced it.</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 font-heading font-semibold text-aubergine"><span className="size-2 rounded-full bg-sage-strong" /> Market evidence</dt>
                <dd className="mt-2 text-sm text-aubergine/70">Facts from public sources on competitors, costs, licensing and precedent.</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 font-heading font-semibold text-aubergine"><span className="size-2 rounded-full bg-burgundy" /> Hypotheses</dt>
                <dd className="mt-2 text-sm text-aubergine/70">AI-generated ideas, always shown as proposals and never as facts.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 border-y border-aubergine/10 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
          <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">
            From a name to a ranked shortlist
          </h2>
          <ol className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="relative pl-14">
                <span className="absolute top-0 left-0 grid size-10 place-items-center rounded-full border border-burgundy/20 font-heading text-sm font-semibold text-burgundy">
                  {i + 1}
                </span>
                <h3 className="font-heading text-lg font-semibold text-aubergine">{title}</h3>
                <p className="mt-2 leading-relaxed text-aubergine/70">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="theme-dark relative overflow-hidden bg-background">
        <BranchLines className="pointer-events-none absolute -right-40 bottom-0 h-full w-[60%] opacity-30" animated={false} />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Pick a signal. Follow the path.</h2>
            <p className="mt-5 text-lg leading-relaxed text-ivory/70">
              Each cultural relationship becomes a hypothesis only when there is a credible way to make money from it.
            </p>
          </div>
          <div className="mt-14">
            <SignalPreview />
          </div>
        </div>
      </section>

      <section id="evaluation" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">
              Judged on explicit criteria, not a magic score
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-aubergine/75">
              Every opportunity is assessed on the same seven questions. Each answer says whether it rests on measured data or on
              the model’s judgement, and where there is no evidence, Outbranch says so.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              <li className="flex items-start gap-3"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-sage-strong" /><span><strong className="font-semibold text-aubergine">Measured</strong> <span className="text-aubergine/70">backed by Qloo data or a sourced figure</span></span></li>
              <li className="flex items-start gap-3"><Lightbulb className="mt-0.5 size-4 shrink-0 text-rose-strong" /><span><strong className="font-semibold text-aubergine">Model assessment</strong> <span className="text-aubergine/70">judgement from the available evidence</span></span></li>
              <li className="flex items-start gap-3"><CircleHelp className="mt-0.5 size-4 shrink-0 text-aubergine/50" /><span><strong className="font-semibold text-aubergine">No data</strong> <span className="text-aubergine/70">shown as a gap, never filled in</span></span></li>
            </ul>
            <p className="mt-8 max-w-lg text-sm leading-relaxed text-aubergine/60">
              Evidence strength is calculated from what was actually collected. Outbranch never states a probability of success.
            </p>
          </div>
          <dl className="divide-y divide-aubergine/10 border-y border-aubergine/10">
            {CRITERIA.map(([name, question]) => (
              <div key={name} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
                <dt className="font-heading font-semibold text-aubergine">{name}</dt>
                <dd className="text-aubergine/70">{question}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-8 border-t border-aubergine/10 bg-card">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">Who it is for</h2>
            <dl className="mt-10 space-y-8">
              {USE_CASES.map(([who, why]) => (
                <div key={who}>
                  <dt className="font-editorial text-2xl text-aubergine">{who}</dt>
                  <dd className="mt-1.5 max-w-md leading-relaxed text-aubergine/70">{why}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">What you get</h2>
            <dl className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {FEATURES.map(([title, body]) => (
                <div key={title}>
                  <dt className="font-heading font-semibold text-aubergine">{title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-aubergine/70">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="theme-dark relative overflow-hidden bg-background">
        <BranchLines className="pointer-events-none absolute inset-y-0 left-[-10%] h-full w-[120%] opacity-40" animated={false} />
        <div className="relative mx-auto max-w-3xl px-4 py-28 text-center sm:px-8">
          <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-6xl">Where should your brand grow next?</h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-ivory/70">Start with a name. Your first shortlist takes a few minutes.</p>
          <Button asChild size="lg" className="mt-10 h-12 rounded-full px-7 text-base">
            <Link href="/projects/new">
              Explore opportunities <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="theme-dark border-t border-ivory/10 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-ivory/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="space-y-2">
            <Logo tone="light" className="text-lg" />
            <p>Cultural intelligence from Qloo Taste AI. Research by Anthropic Claude.</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/brand" className="hover:text-ivory">Brand</Link>
            <a href={REPO_URL} className="inline-flex items-center gap-1.5 hover:text-ivory" target="_blank" rel="noreferrer noopener">
              <GithubIcon className="size-4" /> Open source (MIT)
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
