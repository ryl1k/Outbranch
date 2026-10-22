import Link from "next/link"
import { ArrowRight, BadgeCheck, CircleHelp, Compass, Lightbulb, Radar, Sprout } from "lucide-react"
import { GithubIcon } from "@/components/brand/github-icon"
import { Logo } from "@/components/brand/logo"
import { CriteriaRail } from "@/components/marketing/criteria-rail"
import { EvidenceStrands } from "@/components/marketing/evidence-strands"
import { HeroScene, HeroSceneCompact } from "@/components/marketing/hero-scene"
import { InViewBranches } from "@/components/marketing/in-view-branches"
import { Reveal } from "@/components/marketing/motion"
import { WorkflowBranches } from "@/components/marketing/workflow-branches"
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
] as const

const CRITERIA = [
  ["Cultural relevance", "Is the audience overlap real, and what drives it?"],
  ["Strategic fit", "Does it extend what the brand already stands for?"],
  ["Business model clarity", "Who pays whom, and for what?"],
  ["Commercial potential", "Is there a market large enough to matter?"],
  ["Differentiation", "Would this stand out against what already exists?"],
  ["Feasibility", "Can the brand actually deliver it?"],
  ["Risk and uncertainty", "What could go wrong, and what is still unknown?"],
] as const

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
        <HeroScene className="absolute inset-y-0 left-0 hidden h-full w-[calc(100%-max(0px,(100%-80rem)/2))] xl:block" />
        {/* Keeps the headline legible over the converging streams. */}
        <div
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(26_14_20/0.94)_0%,rgb(26_14_20/0.78)_30%,rgb(26_14_20/0.25)_44%,transparent_54%)] xl:block"
          aria-hidden
        />
        <div className="relative">
          <Nav />
        </div>
        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center px-4 pt-6 pb-10 sm:px-8 xl:min-h-[min(80vh,780px)] xl:pb-24">
          <div className="max-w-2xl">
            <h1 className="animate-rise font-editorial text-[clamp(3rem,6.2vw,5.75rem)] leading-[0.98] text-ivory sm:whitespace-nowrap">
              See further.
              <br />
              <span className="text-rose">Grow smarter.</span>
            </h1>
            <p className="mt-7 max-w-md animate-rise text-lg leading-relaxed text-ivory/75 [animation-delay:150ms]">
              Outbranch transforms cultural intelligence into real growth opportunities for your brand, company, or IP.
            </p>
            <div className="mt-9 animate-rise [animation-delay:300ms]">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link href="/projects/new">
                  Explore opportunities <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
          <HeroScene
            mode="inline"
            className="mt-6 hidden h-auto w-full [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_24%),linear-gradient(to_bottom,transparent,black_6%,black_92%,transparent)] md:block xl:hidden"
          />
          <HeroSceneCompact className="mt-8 w-full md:hidden" />
        </div>
        <div className="relative border-t border-ivory/10">
          <ul className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-8">
            {PILLARS.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 120} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-rose/30 bg-burgundy/40">
                  <Icon className="size-5 text-rose" />
                </span>
                <div>
                  <p className="font-heading font-semibold text-ivory">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/65">{body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <Reveal as="h2" className="font-editorial text-4xl leading-tight text-balance text-aubergine sm:text-5xl">
            Cultural data tells you who your audience is. Outbranch tells you what to do about it.
          </Reveal>
          <div className="space-y-10 text-lg leading-relaxed text-aubergine/80">
            <Reveal as="p" delay={120}>
              Taste is connected. People who love a brand also love particular artists, shows, games, places and other brands.
              Those connections point to partners, products and markets a brand has not considered yet.
            </Reveal>
            <div className="border-t border-aubergine/10 pt-6 text-base">
              <EvidenceStrands />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 overflow-hidden border-y border-aubergine/10 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
          <Reveal as="h2" className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">
            From a name to a ranked shortlist
          </Reveal>
          <div className="mt-14">
            <WorkflowBranches steps={STEPS} />
          </div>
        </div>
      </section>

      <section className="theme-dark relative overflow-hidden bg-background">
        <InViewBranches className="absolute -right-40 bottom-0 h-full w-[60%] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <Reveal as="h2" className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">
              Pick a signal. Follow the path.
            </Reveal>
            <Reveal as="p" delay={120} className="mt-5 text-lg leading-relaxed text-ivory/70">
              Each cultural relationship becomes a hypothesis only when there is a credible way to make money from it.
            </Reveal>
          </div>
          <Reveal delay={200} className="mt-14">
            <SignalPreview />
          </Reveal>
        </div>
      </section>

      <section id="evaluation" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Reveal as="h2" className="font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">
              Judged on explicit criteria, not a magic score
            </Reveal>
            <Reveal as="p" delay={120} className="mt-5 max-w-lg text-lg leading-relaxed text-aubergine/75">
              Every opportunity is assessed on the same seven questions. Each answer says whether it rests on measured data or on
              the model’s judgement, and where there is no evidence, Outbranch says so.
            </Reveal>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                [BadgeCheck, "text-sage-strong", "Measured", "backed by Qloo data or a sourced figure"],
                [Lightbulb, "text-rose-strong", "Model assessment", "judgement from the available evidence"],
                [CircleHelp, "text-aubergine/50", "No data", "shown as a gap, never filled in"],
              ].map(([Icon, tone, label, text], i) => {
                const I = Icon as typeof BadgeCheck
                return (
                  <Reveal as="li" key={label as string} delay={200 + i * 100} from="left" className="flex items-start gap-3">
                    <I className={`mt-0.5 size-4 shrink-0 ${tone}`} />
                    <span>
                      <strong className="font-semibold text-aubergine">{label as string}</strong>{" "}
                      <span className="text-aubergine/70">{text as string}</span>
                    </span>
                  </Reveal>
                )
              })}
            </ul>
            <Reveal as="p" delay={500} className="mt-8 max-w-lg text-sm leading-relaxed text-aubergine/60">
              Evidence strength is calculated from what was actually collected. Outbranch never states a probability of success.
            </Reveal>
          </div>
          <CriteriaRail criteria={CRITERIA} />
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-8 border-t border-aubergine/10 bg-card">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <Reveal as="h2" className="font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">
              Who it is for
            </Reveal>
            <dl className="mt-10 space-y-8 border-l border-burgundy/15 pl-6">
              {USE_CASES.map(([who, why], i) => (
                <Reveal key={who} delay={i * 120} from="left" className="relative">
                  <span className="absolute top-3.5 -left-[29px] size-2 rounded-full bg-burgundy" aria-hidden />
                  <dt className="font-editorial text-2xl text-aubergine">{who}</dt>
                  <dd className="mt-1.5 max-w-md leading-relaxed text-aubergine/70">{why}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
          <div>
            <Reveal as="h2" className="font-heading text-3xl font-semibold tracking-tight text-aubergine sm:text-4xl">
              What you get
            </Reveal>
            <dl className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {FEATURES.map(([title, body], i) => (
                <Reveal key={title} delay={(i % 2) * 120 + Math.floor(i / 2) * 140}>
                  <dt className="flex items-center gap-2 font-heading font-semibold text-aubergine">
                    <span className="h-px w-4 bg-rose-strong" aria-hidden />
                    {title}
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-aubergine/70">{body}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="theme-dark relative overflow-hidden bg-background">
        <InViewBranches className="absolute inset-y-0 left-[-10%] h-full w-[120%] opacity-40" />
        <div className="relative mx-auto max-w-3xl px-4 py-28 text-center sm:px-8">
          <Reveal as="h2" className="font-editorial text-4xl leading-tight text-ivory sm:text-6xl">
            Where should your brand grow next?
          </Reveal>
          <Reveal as="p" delay={150} className="mx-auto mt-5 max-w-lg text-lg text-ivory/70">
            Start with a name. Your first shortlist takes a few minutes.
          </Reveal>
          <Reveal delay={300}>
            <Button asChild size="lg" className="mt-10 h-12 rounded-full px-7 text-base">
              <Link href="/projects/new">
                Explore opportunities <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <footer className="theme-dark border-t border-ivory/10 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-ivory/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="space-y-2">
            <Logo tone="light" className="text-lg" />
            <p>Cultural intelligence from Qloo Taste AI. Research by Anthropic Claude.</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/brand" className="hover:text-ivory">
              Brand
            </Link>
            <a href={REPO_URL} className="inline-flex items-center gap-1.5 hover:text-ivory" target="_blank" rel="noreferrer noopener">
              <GithubIcon className="size-4" /> Open source (MIT)
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
