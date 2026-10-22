"use client"

import { useEffect, useId, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, Globe2, Package, Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"

/** Scene coordinates (viewBox 1600×900). */
const O = { x: 1000, y: 450 }

/**
 * Converging streams: broad translucent ribbons that sweep in from the edges and
 * narrow to the origin. Fixed values keep server and client renders identical.
 */
const STREAMS = [
  // from the left edge: [startX, startY, width, opacity, bright edge]
  [-80, -320, 460, 0.85, 0],
  [-80, -80, 300, 0.6, 1],
  [-80, 130, 200, 0.5, 0],
  [-80, 300, 110, 0.75, 1],
  [-80, 450, 50, 0.9, 1],
  [-80, 600, 110, 0.7, 1],
  [-80, 770, 200, 0.5, 0],
  [-80, 980, 300, 0.6, 1],
  [-80, 1220, 460, 0.85, 0],
] as const

/** Sweeps that fall in from above and below the origin, like the reference's large petals. */
const SWEEPS = [
  [520, -120, 380, 0.8],
  [770, -120, 180, 0.55],
  [520, 1020, 380, 0.75],
  [790, 1020, 180, 0.5],
] as const

const DESTINATIONS = [
  { key: "markets", label: "New markets", icon: BarChart3, y: 175 },
  { key: "partners", label: "Strategic partners", icon: Users, y: 335 },
  { key: "signals", label: "Cultural signals", icon: Globe2, y: 495 },
  { key: "products", label: "New products", icon: Package, y: 655 },
] as const

const PILL_X = 1300
const PILL_W = 270
const PILL_H = 62

/** The demo researches "your company", then Outbranch itself. */
const NAMES = ["Your company", "Outbranch"]

type Phase = "typing" | "researching" | "mapping" | "branching" | "done" | "reset"

const STATUS: Record<Phase, string> = {
  typing: "Enter a brand, company or IP",
  researching: "Researching the brand…",
  mapping: "Mapping cultural signals…",
  branching: "Finding growth paths…",
  done: "4 growth paths found",
  reset: "4 growth paths found",
}

function stream(x0: number, y0: number, w: number) {
  const top = y0 - w / 2
  const bottom = y0 + w / 2
  return `M ${x0} ${top} C ${x0 + 520} ${top}, ${O.x - 330} ${O.y - 3}, ${O.x} ${O.y} C ${O.x - 330} ${O.y + 3}, ${x0 + 520} ${bottom}, ${x0} ${bottom} Z`
}

function sweep(x0: number, y0: number, w: number) {
  const left = x0 - w / 2
  const right = x0 + w / 2
  const dir = y0 < O.y ? 1 : -1
  return `M ${left} ${y0} C ${left} ${y0 + dir * 380}, ${O.x - 260} ${O.y - dir * 4}, ${O.x} ${O.y} C ${O.x - 240} ${O.y - dir * 2}, ${right} ${y0 + dir * 340}, ${right} ${y0} Z`
}

function branch(y: number) {
  return `M ${O.x} ${O.y} C ${O.x + 150} ${O.y}, ${PILL_X - 170} ${y}, ${PILL_X + 10} ${y}`
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(reducedMotionQuery)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  )
}

/** Drives the demo loop: type a name, research it, then grow the branches. */
function useDemo(reduced: boolean) {
  const [nameIndex, setNameIndex] = useState(0)
  const [typed, setTyped] = useState(0)
  const [phase, setPhase] = useState<Phase>("typing")
  const [lit, setLit] = useState(0)
  const name = NAMES[nameIndex]

  useEffect(() => {
    if (reduced) return
    let t: ReturnType<typeof setTimeout>
    if (phase === "typing") {
      t = typed < name.length ? setTimeout(() => setTyped((n) => n + 1), 85) : setTimeout(() => setPhase("researching"), 500)
    } else if (phase === "researching") {
      t = setTimeout(() => setPhase("mapping"), 1100)
    } else if (phase === "mapping") {
      t = setTimeout(() => setPhase("branching"), 1300)
    } else if (phase === "branching") {
      t = lit < DESTINATIONS.length ? setTimeout(() => setLit((n) => n + 1), 380) : setTimeout(() => setPhase("done"), 300)
    } else if (phase === "done") {
      t = setTimeout(() => setPhase("reset"), 3400)
    } else {
      t = setTimeout(() => {
        setLit(0)
        setTyped(0)
        setNameIndex((i) => (i + 1) % NAMES.length)
        setPhase("typing")
      }, 700)
    }
    return () => clearTimeout(t)
  }, [phase, typed, lit, name.length, reduced])

  if (reduced) return { text: NAMES[0], phase: "done" as Phase, lit: DESTINATIONS.length, typing: false }
  return { text: name.slice(0, typed), phase, lit: phase === "reset" ? 0 : lit, typing: phase === "typing" }
}

function useScene() {
  const reduced = useReducedMotion()
  const demo = useDemo(reduced)
  // Ids are per instance: a hidden copy of the scene must not own the gradients another copy uses.
  const uid = `hs${useId().replace(/:/g, "")}`
  return {
    ...demo,
    reduced,
    uid,
    flowing: demo.phase === "researching" || demo.phase === "mapping",
    charged: demo.phase === "mapping" || demo.phase === "branching" || demo.phase === "done",
  }
}

/** Gradients, glow, orbits and converging streams, shared by both layouts. */
function SceneBase({ uid, flowing, charged }: { uid: string; flowing: boolean; charged: boolean }) {
  const ref = (name: string) => `url(#${uid}-${name})`
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-stream`} x1="0" x2="1">
          <stop offset="0" stopColor="#6B112E" stopOpacity="0" />
          <stop offset="0.35" stopColor="#6B112E" stopOpacity="0.9" />
          <stop offset="0.8" stopColor="#C25A77" stopOpacity="0.95" />
          <stop offset="1" stopColor="#F3D3DB" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${uid}-sweep`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#3a0918" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#7a1435" stopOpacity="0.8" />
          <stop offset="1" stopColor="#E7B6C2" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${uid}-edge`} x1="0" x2="1">
          <stop offset="0" stopColor="#D89AA8" stopOpacity="0" />
          <stop offset="0.7" stopColor="#E9B9C5" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFF4F6" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${uid}-branch`} x1="0" x2="1">
          <stop offset="0" stopColor="#FFF4F6" />
          <stop offset="0.55" stopColor="#E7AFBD" />
          <stop offset="1" stopColor="#B4546E" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#B4546E" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#6B112E" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6B112E" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-blur`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* Ambient glow around the origin. */}
      <circle cx={O.x} cy={O.y} r="520" fill={ref("glow")} className="transition-opacity duration-1000" opacity={charged ? 1 : 0.65} />

      {/* Dotted orbits. */}
      {[170, 330].map((r) => (
        <circle key={r} cx={O.x} cy={O.y} r={r} fill="none" stroke="#D89AA8" strokeOpacity="0.22" strokeDasharray="1 7" strokeLinecap="round" />
      ))}

      {/* Converging streams. */}
      <g className="transition-opacity duration-700" opacity={flowing || charged ? 1 : 0.8}>
        {SWEEPS.map(([x, y, w, o], i) => (
          <path key={`s${i}`} d={sweep(x, y, w)} fill={ref("sweep")} opacity={o} />
        ))}
        {STREAMS.map(([x, y, w, o, bright], i) => (
          <g key={`r${i}`}>
            <path d={stream(x, y, w)} fill={ref("stream")} opacity={o} />
            {bright ? (
              <path
                d={`M ${x} ${y} C ${x + 520} ${y}, ${O.x - 330} ${O.y}, ${O.x} ${O.y}`}
                fill="none"
                stroke={ref("edge")}
                strokeWidth="1.4"
                strokeDasharray={flowing ? "6 18" : undefined}
                className={flowing ? "animate-flow" : undefined}
              />
            ) : null}
          </g>
        ))}
      </g>
    </>
  )
}

function OriginRing({ charged }: { charged: boolean }) {
  return (
    <g>
      <circle cx={O.x} cy={O.y} r={charged ? 40 : 30} fill="#D89AA8" opacity={charged ? 0.18 : 0} className="transition-all duration-700" />
      <circle cx={O.x} cy={O.y} r="21" fill="#FFF4F6" />
      <circle cx={O.x} cy={O.y} r="13" fill="#3a0918" />
      <circle cx={O.x} cy={O.y} r="5" fill="#B4546E" opacity={charged ? 1 : 0} className="transition-opacity duration-500" />
    </g>
  )
}

/** A growth path: a soft glow underneath and a crisp ribbon that draws itself in. */
function Branch({ uid, d, on, emphasis, reduced }: { uid: string; d: string; on: boolean; emphasis: boolean; reduced: boolean }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#E7AFBD"
        strokeWidth="22"
        strokeLinecap="round"
        filter={`url(#${uid}-blur)`}
        opacity={on ? (emphasis ? 0.85 : 0.5) : 0}
        className="transition-opacity duration-700"
      />
      <path
        d={d}
        fill="none"
        stroke={`url(#${uid}-branch)`}
        strokeWidth={emphasis ? 9 : 6.5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={on ? 0 : 1}
        style={{ transition: reduced ? undefined : "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1), stroke-width 200ms" }}
      />
      {/* Faint guide so the path is visible before it lights up. */}
      <path d={d} fill="none" stroke="#D89AA8" strokeOpacity="0.14" strokeWidth="2" />
    </g>
  )
}

/** The search field where the demo types a company name, with its research status. */
function Capsule({ text, typing, phase, size = "lg" }: { text: string; typing: boolean; phase: Phase; size?: "lg" | "sm" }) {
  const lg = size === "lg"
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-full border border-rose/35 bg-[#2a1220]/85 text-ivory shadow-[0_10px_40px_-12px_rgb(0_0_0/0.6)] backdrop-blur",
          lg ? "h-[58px] px-6 text-[21px]" : "h-12 px-5 text-base",
        )}
      >
        <Search className={cn("shrink-0 text-rose", lg ? "size-5" : "size-4")} aria-hidden />
        <span className="truncate font-heading font-semibold">{text}</span>
        <span className={cn("-ml-2 w-[2px] bg-rose", lg ? "h-7" : "h-5", typing ? "animate-pulse" : "opacity-0")} aria-hidden />
      </div>
      <p className={cn("font-mono text-ivory/65", lg ? "text-[14px]" : "text-xs")}>{STATUS[phase]}</p>
    </div>
  )
}

/**
 * Desktop scene: streams converge from the left, branches fan out to the right.
 * "background" fills the hero behind the copy; "inline" sits below it, cropped to the origin.
 */
export function HeroScene({ className, mode = "background" }: { className?: string; mode?: "background" | "inline" }) {
  const { text, phase, lit, typing, reduced, uid, flowing, charged } = useScene()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <svg
      viewBox={mode === "background" ? "0 0 1600 900" : "520 110 1080 640"}
      preserveAspectRatio={mode === "background" ? "xMaxYMid slice" : "xMidYMid meet"}
      className={cn("select-none", className)}
      role="group"
      aria-label="Animated demo: Outbranch researches a company and finds new markets, strategic partners, cultural signals and new products."
    >
      <SceneBase uid={uid} flowing={flowing} charged={charged} />
      {DESTINATIONS.map((d, i) => (
        <Branch key={d.key} uid={uid} d={branch(d.y)} on={i < lit} emphasis={hovered === d.key} reduced={reduced} />
      ))}
      <OriginRing charged={charged} />

      <foreignObject x={O.x - 215} y={O.y + 62} width="320" height="116">
        <Capsule text={text} typing={typing} phase={phase} />
      </foreignObject>

      {DESTINATIONS.map((d, i) => {
        const Icon = d.icon
        const on = i < lit
        return (
          <foreignObject key={d.key} x={PILL_X} y={d.y - PILL_H / 2} width={PILL_W + 20} height={PILL_H}>
            <Link
              href="/projects/new"
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(d.key)}
              onBlur={() => setHovered(null)}
              tabIndex={on ? 0 : -1}
              aria-hidden={!on}
              className={cn(
                "flex h-full w-[270px] items-center gap-3 rounded-full border px-5 text-[19px] font-medium text-ivory transition-all duration-500",
                on ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
                hovered === d.key ? "border-rose bg-[#7a1435]" : "border-rose/40 bg-[#5a0f27]/85",
              )}
            >
              <Icon className="size-5 shrink-0 text-ivory" aria-hidden />
              <span className="flex-1 whitespace-nowrap">{d.label}</span>
              <ArrowRight className="size-5 shrink-0 opacity-80" aria-hidden />
            </Link>
          </foreignObject>
        )
      })}
    </svg>
  )
}

/** Phone layout: the converging origin on top, then the typed name and the growth paths as a list. */
export function HeroSceneCompact({ className }: { className?: string }) {
  const { text, phase, lit, typing, reduced, uid, flowing, charged } = useScene()
  const spread = [-0.62, -0.2, 0.2, 0.62]
  return (
    <div className={cn("select-none", className)}>
      <svg
        viewBox="560 250 600 400"
        className="-mx-4 h-auto w-[calc(100%+2rem)] [mask-image:radial-gradient(ellipse_at_60%_50%,black_45%,transparent_78%)]"
        aria-hidden
      >
        <SceneBase uid={uid} flowing={flowing} charged={charged} />
        {spread.map((a, i) => (
          <Branch
            key={a}
            uid={uid}
            d={`M ${O.x} ${O.y} C ${O.x + 60} ${O.y}, ${O.x + 90} ${O.y + a * 150}, ${O.x + 170} ${O.y + a * 160}`}
            on={i < lit}
            emphasis={false}
            reduced={reduced}
          />
        ))}
        <OriginRing charged={charged} />
      </svg>
      <div className="-mt-4 space-y-5 px-1">
        <Capsule text={text} typing={typing} phase={phase} size="sm" />
        <ul className="grid grid-cols-2 gap-2.5" aria-label="Growth paths">
          {DESTINATIONS.map((d, i) => {
            const Icon = d.icon
            const on = i < lit
            return (
              <li
                key={d.key}
                className={cn(
                  "flex items-center gap-2 rounded-full border border-rose/40 bg-[#5a0f27]/85 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap text-ivory transition-all duration-500",
                  on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {d.label}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
