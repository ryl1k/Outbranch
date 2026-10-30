import { cn } from "@/lib/utils"

/**
 * The hero landscape: layered ridges in haze and one mountain, with a lit trail
 * that climbs from insight to opportunity to growth. Pure SVG and CSS, so it renders
 * on the server; the trail draws once on load and holds still for reduced motion.
 */

type Pt = readonly [number, number]

/** Deterministic noise, so server and client markup match. */
function random(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEPTH = 5
/** Each original segment becomes this many after roughening. */
const SPLIT = 2 ** DEPTH

/** Roughens a polyline by midpoint displacement, giving the ridge a rocky edge. */
function rugged(points: readonly Pt[], roughness: number, seed: number, depth = DEPTH): Pt[] {
  const rnd = random(seed)
  let line: Pt[] = [...points]
  let amp = roughness
  for (let level = 0; level < depth; level++) {
    const next: Pt[] = [line[0]]
    for (let i = 1; i < line.length; i++) {
      const [x0, y0] = line[i - 1]
      const [x1, y1] = line[i]
      const len = Math.hypot(x1 - x0, y1 - y0)
      next.push([(x0 + x1) / 2, (y0 + y1) / 2 + (rnd() - 0.5) * len * amp], line[i])
    }
    line = next
    amp *= 0.55
  }
  return line
}

function toPath(line: readonly Pt[], move = true) {
  return line.map(([x, y], i) => `${i || !move ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
}

/** A closed silhouette: the ridge line, then down to the bottom of the scene. */
function silhouette(points: readonly Pt[], roughness: number, seed: number) {
  const [first] = points
  const last = points[points.length - 1]
  return `${toPath(rugged(points, roughness, seed))} L ${last[0]} 900 L ${first[0]} 900 Z`
}

const PEAK: Pt = [1180, 205]

const DISTANT = silhouette(
  [[-20, 520], [140, 470], [300, 500], [460, 430], [620, 480], [780, 440], [940, 470], [1300, 400], [1460, 450], [1620, 410]],
  0.18,
  11,
)
const FAR = silhouette(
  [[-20, 600], [180, 540], [330, 575], [520, 500], [700, 560], [860, 520], [1020, 470], [1240, 430], [1420, 480], [1620, 440]],
  0.16,
  7,
)
const MID = silhouette(
  [[-20, 690], [160, 640], [340, 670], [520, 610], [700, 650], [880, 600], [1400, 620], [1620, 580]],
  0.14,
  19,
)
/** The main mountain: shoulders on both sides of one summit. */
const MOUNTAIN_RIDGE: Pt[] = [
  [480, 900], [600, 800], [700, 730], [790, 680], [850, 610], [905, 585], [960, 505], [1010, 470], [1050, 395], [1100, 330], [1130, 290], PEAK,
  [1215, 240], [1260, 262], [1300, 250], [1345, 300], [1400, 345], [1470, 370], [1540, 420], [1620, 450],
]
const SUMMIT = MOUNTAIN_RIDGE.indexOf(PEAK)
const RIDGE = rugged(MOUNTAIN_RIDGE, 0.2, 3)
const MOUNTAIN = `${toPath(RIDGE)} L 1620 900 L 480 900 Z`
const CREASE = rugged([PEAK, [1150, 330], [1135, 480], [1090, 640], [1060, 900]], 0.16, 41)
/** The face that catches the glow, bounded by the left ridge and a crease from the summit. */
const LIT_FACE = `${toPath(RIDGE.slice(0, SUMMIT * SPLIT + 1))} ${toPath(CREASE.slice(1), false)} Z`
/** The face turned away from the glow. */
const SHADOW_FACE = `${toPath(RIDGE.slice(SUMMIT * SPLIT))} L 1620 900 ${toPath([...CREASE].reverse(), false)} Z`
/** Light catching the ridge line around the summit. */
const RIM = toPath(RIDGE.slice(6 * SPLIT, 16 * SPLIT + 1))
const FOREGROUND = silhouette([[-20, 800], [200, 770], [420, 800], [640, 850], [820, 900]], 0.12, 23)

/** Stops along the trail, with where the label sits. */
const STOPS = [
  { label: "Insight", at: [905, 762] as Pt, delay: 1.1 },
  { label: "Opportunity", at: [1052, 522] as Pt, delay: 2.0 },
  { label: "Growth", at: [1180, 200] as Pt, delay: 2.9 },
]

/** A switchback trail from the valley floor to the summit. */
const TRAIL = `M ${(
  [
    [760, 905], [830, 840], [880, 800], [905, 762], [960, 735], [930, 700], [990, 660], [1010, 610], [985, 575], [1052, 522],
    [1090, 480], [1070, 440], [1110, 395], [1118, 352], [1140, 310], [1160, 268], [1172, 232], [1180, 200],
  ] as const
)
  .map(([x, y]) => `${x} ${y}`)
  .join(" L ")}`

export function MountainScene({ className, viewBox = "0 0 1600 900" }: { className?: string; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMaxYMax slice" className={cn("select-none", className)} aria-hidden>
      <defs>
        <linearGradient id="mt-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1A0E14" />
          <stop offset="0.55" stopColor="#2c1220" />
          <stop offset="1" stopColor="#3d1828" />
        </linearGradient>
        <radialGradient id="mt-glow" cx="1180" cy="330" r="720" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9a4e62" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#6B112E" stopOpacity="0.28" />
          <stop offset="1" stopColor="#6B112E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mt-far" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5a2a3b" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2a1220" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="mt-mid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3f1a2a" />
          <stop offset="1" stopColor="#1f0e17" />
        </linearGradient>
        <linearGradient id="mt-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3d1a29" />
          <stop offset="0.5" stopColor="#2a111d" />
          <stop offset="1" stopColor="#170a11" />
        </linearGradient>
        <linearGradient id="mt-lit" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#b4546e" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#6B112E" stopOpacity="0.18" />
          <stop offset="1" stopColor="#6B112E" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mt-trail" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="#D89AA8" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#F3D3DB" />
          <stop offset="1" stopColor="#FFF4F6" />
        </linearGradient>
        <filter id="mt-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="mt-haze" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#mt-sky)" />
      <rect width="1600" height="900" fill="url(#mt-glow)" />

      <path d={DISTANT} fill="#7a3a50" opacity="0.35" />
      <path d={FAR} fill="url(#mt-far)" />
      {/* Valley mist drifting between the ridges. */}
      <g className="animate-[drift_22s_ease-in-out_infinite_alternate] motion-reduce:animate-none" filter="url(#mt-haze)">
        <ellipse cx="560" cy="640" rx="520" ry="46" fill="#D89AA8" opacity="0.1" />
        <ellipse cx="1320" cy="600" rx="380" ry="40" fill="#D89AA8" opacity="0.08" />
      </g>
      <path d={MID} fill="url(#mt-mid)" />

      <path d={MOUNTAIN} fill="url(#mt-body)" />
      <path d={LIT_FACE} fill="url(#mt-lit)" />
      <path d={SHADOW_FACE} fill="#0f070b" opacity="0.45" />
      <path d={RIM} fill="none" stroke="#E7AFBD" strokeOpacity="0.35" strokeWidth="1.4" strokeLinejoin="round" />

      <g className="animate-[drift_30s_ease-in-out_infinite_alternate-reverse] motion-reduce:animate-none" filter="url(#mt-haze)">
        <ellipse cx="780" cy="830" rx="600" ry="50" fill="#D89AA8" opacity="0.07" />
      </g>
      <path d={FOREGROUND} fill="#12080d" />

      {/* The trail: a soft glow, a crisp line that draws itself, then a light that keeps climbing. */}
      <path
        d={TRAIL}
        fill="none"
        stroke="#E7AFBD"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#mt-blur)"
        opacity="0.55"
        pathLength={1}
        strokeDasharray="1"
        className="animate-draw-path [--path-length:1] [animation-delay:400ms] [animation-duration:2.8s] motion-reduce:animate-none"
      />
      <path
        d={TRAIL}
        fill="none"
        stroke="url(#mt-trail)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        className="animate-draw-path [--path-length:1] [animation-delay:400ms] [animation-duration:2.8s] motion-reduce:animate-none"
      />
      <g className="animate-rise [animation-delay:3.2s] motion-reduce:hidden">
        <path
          d={TRAIL}
          fill="none"
          stroke="#FFF4F6"
          strokeWidth="5"
          strokeLinecap="round"
        strokeLinejoin="round"
          pathLength={100}
          strokeDasharray="4 96"
          className="animate-[branch-pulse_4.5s_linear_infinite] [animation-delay:3.2s]"
        />
      </g>

      {STOPS.map(({ label, at: [x, y], delay }) => (
        <g key={label} className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${delay}s` }}>
          <circle cx={x} cy={y} r="22" fill="#F3D3DB" opacity="0.18" filter="url(#mt-blur)" />
          <circle cx={x} cy={y} r="9.5" fill="#FFF4F6" />
          <circle cx={x} cy={y} r="5" fill="#9a4e62" />
          <text
            x={x + 24}
            y={y + 5}
            fill="#F8F3EE"
            fillOpacity="0.85"
            fontSize="15"
            letterSpacing="2.5"
            className="font-sans font-medium uppercase"
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  )
}
