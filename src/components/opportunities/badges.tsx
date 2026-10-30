import {
  Blocks,
  Compass,
  Globe2,
  Handshake,
  Layers,
  Package,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"
import type { EvidenceStrength } from "@/generated/prisma/enums"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CATEGORY_LABELS, type Level, type OpportunityCategory } from "@/lib/schemas/discovery"
import { cn } from "@/lib/utils"

export const CATEGORY_ICONS: Record<OpportunityCategory, React.ComponentType<{ className?: string }>> = {
  PRODUCT_CATEGORY: Package,
  PARTNERSHIP: Handshake,
  COLLABORATION: Sparkles,
  LICENSING: Layers,
  AUDIENCE: Users,
  GEOGRAPHIC: Globe2,
  EXPERIENTIAL: Ticket,
  ADJACENT_MARKET: Compass,
}

export function CategoryBadge({ category, className }: { category: OpportunityCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? Blocks
  return (
    <Badge variant="outline" className={cn("text-muted-foreground", className)}>
      <Icon /> {CATEGORY_LABELS[category]}
    </Badge>
  )
}

const STRENGTH: Record<EvidenceStrength, { label: string; variant: React.ComponentProps<typeof Badge>["variant"]; bars: number }> = {
  STRONG: { label: "Strong evidence", variant: "sage", bars: 4 },
  MODERATE: { label: "Moderate evidence", variant: "info", bars: 3 },
  LIMITED: { label: "Limited evidence", variant: "warning", bars: 2 },
  INSUFFICIENT: { label: "Insufficient evidence", variant: "danger", bars: 1 },
}

export function EvidenceStrengthBadge({ strength }: { strength: EvidenceStrength }) {
  const s = STRENGTH[strength]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={s.variant} className="cursor-help">
          <span className="flex items-end gap-px" aria-hidden>
            {[1, 2, 3, 4].map((b) => (
              <span key={b} className={cn("w-0.5 rounded-full bg-current", b <= s.bars ? "opacity-100" : "opacity-25")} style={{ height: 3 + b * 2 }} />
            ))}
          </span>
          {s.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        Derived from collected evidence, not model confidence: Qloo relationships plus independently sourced commercial
        claims, minus contradicting sources.
      </TooltipContent>
    </Tooltip>
  )
}

const LEVEL_LABEL: Record<Level, string> = {
  very_low: "Very low",
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very high",
}
const LEVEL_INDEX: Record<Level, number> = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 }

/** Five-step meter for a criterion. `inverse` for criteria where higher is worse. */
export function LevelMeter({
  level,
  inverse = false,
  unavailable = false,
  className,
}: {
  level: Level
  inverse?: boolean
  unavailable?: boolean
  className?: string
}) {
  const n = LEVEL_INDEX[level]
  const tone = unavailable ? "bg-muted-foreground/30" : inverse ? (n >= 4 ? "bg-destructive" : n === 3 ? "bg-warning" : "bg-sage-strong") : "bg-primary"
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-1.5 w-3 rounded-full", i <= n ? tone : "bg-muted")} />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">{unavailable ? "Unavailable" : LEVEL_LABEL[level]}</span>
    </span>
  )
}
