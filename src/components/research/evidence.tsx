import { BadgeCheck, CircleHelp, Lightbulb, Ban, UserRound } from "lucide-react"
import type { ClaimStatus } from "@/generated/prisma/enums"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export const CLAIM_STATUS: Record<
  ClaimStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: React.ComponentProps<typeof Badge>["variant"]; help: string }
> = {
  VERIFIED: {
    label: "Verified",
    icon: BadgeCheck,
    variant: "sage",
    help: "Supported by a public source retrieved during research.",
  },
  USER_PROVIDED: { label: "Your input", icon: UserRound, variant: "info", help: "Provided or corrected by you." },
  INFERRED: {
    label: "Inferred",
    icon: Lightbulb,
    variant: "rose",
    help: "An AI inference from the research, not directly sourced.",
  },
  UNCERTAIN: {
    label: "Uncertain",
    icon: CircleHelp,
    variant: "warning",
    help: "Sources were thin or conflicting. Treat with caution.",
  },
  REJECTED: { label: "Removed", icon: Ban, variant: "muted", help: "Removed by you; excluded from analysis." },
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const s = CLAIM_STATUS[status]
  const Icon = s.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={s.variant} className="cursor-help">
          <Icon /> {s.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{s.help}</TooltipContent>
    </Tooltip>
  )
}

export function EvidenceLegend({ counts }: { counts: Partial<Record<ClaimStatus, number>> }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Evidence summary">
      {(["VERIFIED", "USER_PROVIDED", "INFERRED", "UNCERTAIN"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClaimStatusBadge status={s} />
          <span className="font-mono">{counts[s] ?? 0}</span>
        </li>
      ))}
    </ul>
  )
}
