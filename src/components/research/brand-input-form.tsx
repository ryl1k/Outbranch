"use client"

import { useState, useTransition } from "react"
import { ArrowRight, ChevronDown, Loader2, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { toastActionError } from "@/components/billing/paywall-toast"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BUDGET_LABELS, BUDGET_RANGES, type UserContext } from "@/lib/schemas/project"
import { cn } from "@/lib/utils"
import { createProject } from "@/server/projects/actions"

const EXAMPLES = ["Liquid Death", "Stranger Things", "Patagonia", "Duolingo", "aesop.com"]

const CONTEXT_FIELDS: { key: Exclude<keyof UserContext, "budgetRange">; label: string; placeholder: string; long?: boolean }[] = [
  { key: "industry", label: "Main industry", placeholder: "e.g. Beverages" },
  { key: "targetMarket", label: "Target market", placeholder: "e.g. Gen Z in the US and UK" },
  { key: "products", label: "Existing products", placeholder: "Key products or services", long: true },
  { key: "objectives", label: "Business objectives", placeholder: "What growth are you looking for?", long: true },
  { key: "constraints", label: "Constraints", placeholder: "Anything we must respect", long: true },
  { key: "excludedCategories", label: "Excluded categories", placeholder: "e.g. alcohol, gambling" },
]

export function BrandInputForm() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [context, setContext] = useState<UserContext>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProject({ identifier, context })
      if (result && !result.ok) {
        setError(result.error)
        toastActionError(result, router)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="identifier" className="text-sm font-medium">
          What should Outbranch research?
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="identifier"
            autoFocus
            required
            minLength={2}
            maxLength={500}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="A brand, company, product, IP, website or short description"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "identifier-error" : "identifier-hint"}
            className="h-14 rounded-xl bg-card pl-12 text-base shadow-soft md:text-base"
          />
        </div>
        {error ? (
          <p id="identifier-error" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p id="identifier-hint" className="text-xs text-muted-foreground">
            One identifier is enough. If it is ambiguous, you will choose the right entity before research continues.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Try</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setIdentifier(ex)}
              className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          Add context (optional)
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
            {CONTEXT_FIELDS.map((f) => (
              <div key={f.key} className={cn("space-y-1.5", f.long && "sm:col-span-2")}>
                <Label htmlFor={f.key} className="text-xs">
                  {f.label}
                </Label>
                {f.long ? (
                  <Textarea
                    id={f.key}
                    rows={2}
                    maxLength={600}
                    placeholder={f.placeholder}
                    value={context[f.key] ?? ""}
                    onChange={(e) => setContext((c) => ({ ...c, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={f.key}
                    maxLength={300}
                    placeholder={f.placeholder}
                    value={context[f.key] ?? ""}
                    onChange={(e) => setContext((c) => ({ ...c, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs">Budget range</Label>
              <Select
                value={context.budgetRange}
                onValueChange={(v) => setContext((c) => ({ ...c, budgetRange: v as UserContext["budgetRange"] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {BUDGET_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" size="lg" disabled={pending || identifier.trim().length < 2} className="h-12 px-6 text-base">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Explore Opportunities
        {!pending && <ArrowRight />}
      </Button>
    </form>
  )
}
