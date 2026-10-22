import { FlaskConical, Radio } from "lucide-react"
import type { DataMode, ProjectStage } from "@/generated/prisma/enums"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-balance sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const STAGES: Record<ProjectStage, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  INPUT: { label: "Queued", variant: "muted" },
  RESOLVING: { label: "Identifying", variant: "info" },
  NEEDS_SELECTION: { label: "Needs your choice", variant: "warning" },
  RESEARCHING_BRAND: { label: "Researching brand", variant: "info" },
  NEEDS_CONFIRMATION: { label: "Review profile", variant: "warning" },
  CONFIGURING: { label: "Ready to analyse", variant: "accent" },
  DISCOVERING: { label: "Discovering", variant: "info" },
  READY: { label: "Opportunities ready", variant: "success" },
  FAILED: { label: "Needs attention", variant: "danger" },
}

export function StageBadge({ stage }: { stage: ProjectStage }) {
  const s = STAGES[stage]
  return <Badge variant={s.variant}>{s.label}</Badge>
}

/** Always visible wherever Qloo-derived data is shown. */
export function DataModeBadge({ mode, className }: { mode: DataMode; className?: string }) {
  const live = mode === "LIVE"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={live ? "sage" : "warning"} className={cn("cursor-help", className)}>
          {live ? <Radio /> : <FlaskConical />}
          {live ? "Live data" : "Simulated data"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        {live
          ? "Cultural signals come from live Qloo API queries made for this project."
          : "Fixture mode: cultural signals are synthetic placeholders for development. They are not research."}
      </TooltipContent>
    </Tooltip>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center", className)}>
      <div className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
