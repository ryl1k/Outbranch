"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  CATEGORY_LABELS,
  OPPORTUNITY_CATEGORIES,
  RISK_APPETITES,
  type AnalysisConfig,
  type OpportunityCategory,
} from "@/lib/schemas/discovery"
import { cn } from "@/lib/utils"
import { startDiscovery } from "@/server/projects/actions"

function ChipInput({
  id,
  label,
  hint,
  values,
  max,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  hint: string
  values: string[]
  max: number
  placeholder: string
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v) && values.length < max) onChange([...values, v])
    setDraft("")
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          disabled={values.length >= max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" aria-label={`Add ${label.toLowerCase()}`} onClick={add}>
          <Plus />
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function AnalysisConfigForm({
  projectId,
  initial,
  submitLabel = "Discover opportunities",
  compact = false,
  onDone,
}: {
  projectId: string
  initial: Partial<AnalysisConfig>
  submitLabel?: string
  compact?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [focus, setFocus] = useState<OpportunityCategory[]>(initial.focusCategories ?? [])
  const [excluded, setExcluded] = useState<string[]>(initial.excludedCategories ?? [])
  const [regions, setRegions] = useState<string[]>(initial.regions ?? [])
  const [objectives, setObjectives] = useState(initial.objectives ?? "")
  const [risk, setRisk] = useState<string>(initial.riskAppetite ?? "")
  const [notes, setNotes] = useState(initial.notes ?? "")

  const submit = () =>
    start(async () => {
      const res = await startDiscovery(projectId, {
        focusCategories: focus,
        excludedCategories: excluded,
        regions,
        objectives: objectives || undefined,
        budgetRange: initial.budgetRange,
        riskAppetite: (risk || undefined) as AnalysisConfig["riskAppetite"],
        notes: notes || undefined,
      })
      if (!res.ok) toast.error(res.error)
      else {
        onDone?.()
        router.refresh()
      }
    })

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <p className="text-sm font-medium">Opportunity types</p>
        <p className="text-xs text-muted-foreground">Leave all unselected to explore every type.</p>
        <ToggleGroup
          type="multiple"
          value={focus}
          onValueChange={(v) => setFocus(v as OpportunityCategory[])}
          className="flex flex-wrap justify-start gap-2"
          aria-label="Opportunity types"
        >
          {OPPORTUNITY_CATEGORIES.map((c) => (
            <ToggleGroupItem
              key={c}
              value={c}
              variant="outline"
              size="sm"
              className="rounded-full! border px-3 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {CATEGORY_LABELS[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className={cn("grid gap-6", !compact && "md:grid-cols-2")}>
        <ChipInput
          id="regions"
          label="Geographic focus"
          hint="Up to 3. The first region re-weights Qloo results toward local taste."
          values={regions}
          max={3}
          placeholder="e.g. Japan, Germany, Los Angeles"
          onChange={setRegions}
        />
        <ChipInput
          id="excluded"
          label="Exclude"
          hint="Categories, partner types or themes to avoid."
          values={excluded}
          max={10}
          placeholder="e.g. luxury brands, alcohol"
          onChange={setExcluded}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Risk appetite</p>
        <ToggleGroup type="single" value={risk} onValueChange={setRisk} variant="outline" className="justify-start" aria-label="Risk appetite">
          {RISK_APPETITES.map((r) => (
            <ToggleGroupItem key={r} value={r} className="px-4 capitalize">
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className={cn("grid gap-6", !compact && "md:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor="objectives" className="text-sm font-medium">
            Objectives
          </Label>
          <Textarea id="objectives" rows={3} maxLength={600} value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="e.g. New revenue streams within 18 months" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Instructions for this run
          </Label>
          <Textarea id="notes" rows={3} maxLength={600} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Find emerging partners; compare licensing with direct product expansion" />
        </div>
      </div>

      <Button size="lg" onClick={submit} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {submitLabel}
        {!pending && <ArrowRight />}
      </Button>
    </div>
  )
}
