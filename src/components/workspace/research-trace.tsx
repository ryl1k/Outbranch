import { Bot, Globe, Sparkles, type LucideIcon } from "lucide-react"
import type { Provider } from "@/generated/prisma/client"
import { cn } from "@/lib/utils"

export type TraceCall = {
  provider: Provider
  operation: string
  ok: boolean
  cacheHit: boolean
  webSearches: number
  createdAt: Date
}

/** Operation ids (see `usage("…")` in the jobs) grouped into the steps a researcher would recognise. */
const STEPS: Record<string, string> = {
  "resolve.search": "Find the entity",
  "qloo.resolve": "Match in Qloo",
  "resolve.decide": "Confirm the match",
  "brand.web": "Research the brand",
  "brand.extract": "Build the profile",
  "discovery.plan": "Plan domains",
  "discovery.qloo": "Cultural signals",
  "discovery.insights": "Interpret patterns",
  "discovery.generate": "Draft hypotheses",
  "commercial.web": "Commercial case",
  "commercial.extract": "Commercial case",
  "discovery.evaluate": "Score opportunities",
  "deep-dive.write": "Write the deep dive",
}

function stepLabel(operation: string) {
  if (STEPS[operation]) return STEPS[operation]
  const word = operation.split(".").at(-1) ?? operation
  return word.charAt(0).toUpperCase() + word.slice(1).replace(/-/g, " ")
}

type Lane = { key: "ai" | "web" | "qloo"; label: string; icon: LucideIcon; tone: string; count: number; failed: number; cached: number }

type Step = { label: string; lanes: Lane[]; failed: boolean }

function buildSteps(calls: TraceCall[]): Step[] {
  const steps = new Map<string, { ai: TraceCall[]; qloo: TraceCall[]; web: number; webFailed: number }>()
  for (const call of [...calls].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const label = stepLabel(call.operation)
    const step = steps.get(label) ?? { ai: [], qloo: [], web: 0, webFailed: 0 }
    if (call.provider === "QLOO") step.qloo.push(call)
    else if (call.provider === "WEB_SEARCH") {
      step.web += Math.max(1, call.webSearches)
      if (!call.ok) step.webFailed += 1
    } else {
      step.ai.push(call)
      step.web += call.webSearches
    }
    steps.set(label, step)
  }

  return [...steps].map(([label, s]) => {
    const lanes: Lane[] = []
    const failed = (list: TraceCall[]) => list.filter((c) => !c.ok).length
    if (s.web) lanes.push({ key: "web", label: s.web === 1 ? "web search" : "web searches", icon: Globe, tone: "text-info", count: s.web, failed: s.webFailed, cached: 0 })
    if (s.qloo.length)
      lanes.push({
        key: "qloo",
        label: s.qloo.length === 1 ? "Qloo call" : "Qloo calls",
        icon: Sparkles,
        tone: "text-sage-strong",
        count: s.qloo.length,
        failed: failed(s.qloo),
        cached: s.qloo.filter((c) => c.cacheHit).length,
      })
    if (s.ai.length)
      lanes.push({
        key: "ai",
        label: s.ai.length === 1 ? "AI call" : "AI calls",
        icon: Bot,
        tone: "text-rose-strong",
        count: s.ai.length,
        failed: failed(s.ai),
        cached: 0,
      })
    return { label, lanes, failed: lanes.some((l) => l.failed > 0) }
  })
}

/**
 * How a research run travelled: each step on the spine, with the AI calls, web searches and Qloo
 * requests it branched into. Built from usage records, so it reflects what actually ran.
 */
export function ResearchTrace({ calls }: { calls: TraceCall[] }) {
  const steps = buildSteps(calls)
  if (!steps.length) return null

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">How this run went</span>
        <Legend icon={Bot} tone="text-rose-strong" label="AI" />
        <Legend icon={Globe} tone="text-info" label="Web search" />
        <Legend icon={Sparkles} tone="text-sage-strong" label="Qloo" />
      </figcaption>
      <ol className="scrollbar-none flex flex-col overflow-x-auto pb-1 md:flex-row" aria-label="Research steps">
        {steps.map((step, i) => (
          <li key={step.label} className="relative flex min-w-0 gap-3 pb-4 md:min-w-36 md:flex-1 md:flex-col md:gap-0 md:pr-3 md:pb-0">
            {/* Spine: vertical on phones, horizontal from md. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-3 left-[5px] h-full w-px bg-border-strong md:top-[5px] md:left-3 md:h-px md:w-full",
                i === steps.length - 1 && "hidden",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-1 size-[11px] shrink-0 rounded-full border-2 bg-card md:mt-0",
                step.failed ? "border-warning" : "border-rose-strong",
              )}
            />
            <div className="min-w-0 md:mt-3">
              <p className="text-sm font-medium leading-snug">
                <span className="sr-only">Step {i + 1}: </span>
                {step.label}
              </p>
              <ul className="mt-1.5 space-y-1 border-l border-dashed border-border-strong pl-2.5">
                {step.lanes.map((lane) => (
                  <li key={lane.key} className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                    <lane.icon className={cn("size-3.5 shrink-0", lane.tone)} aria-hidden />
                    <span>
                      {lane.count} {lane.label}
                    </span>
                    {lane.failed > 0 && <span className="text-warning">· {lane.failed} failed</span>}
                    {lane.cached > 0 && <span className="text-muted-foreground">· {lane.cached} cached</span>}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  )
}

function Legend({ icon: Icon, tone, label }: { icon: LucideIcon; tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("size-3.5", tone)} aria-hidden />
      {label}
    </span>
  )
}
