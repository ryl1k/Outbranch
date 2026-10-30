"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, ExternalLink, Loader2, SearchX } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ENTITY_KIND_LABELS, entityKindSchema } from "@/lib/schemas/brand"
import { cn } from "@/lib/utils"
import { restartResolution, selectCandidate } from "@/server/projects/actions"

type Candidate = {
  id: string
  name: string
  kind: string
  description: string
  url: string | null
  parentName: string | null
}

export function CandidatePicker({
  projectId,
  identifier,
  candidates,
  explanation,
}: {
  projectId: string
  identifier: string
  candidates: Candidate[]
  explanation?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(candidates[0]?.id ?? null)
  const [refined, setRefined] = useState(identifier)
  const [pending, startTransition] = useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | undefined>) =>
    startTransition(async () => {
      const res = await fn()
      if (res && !res.ok) toast.error(res.error ?? "Something went wrong")
      else router.refresh()
    })

  const notFound = candidates.length === 0

  return (
    <section className="space-y-6">
      <div className="space-y-1.5">
        <p className="eyebrow">{notFound ? "Entity not found" : "Confirm the entity"}</p>
        <h2 className="text-xl font-semibold">
          {notFound ? `We could not verify “${identifier}”` : `Which “${identifier}” do you mean?`}
        </h2>
        {explanation && <p className="max-w-2xl text-sm text-muted-foreground">{explanation}</p>}
      </div>

      {notFound ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          <SearchX className="mt-0.5 size-5 shrink-0" />
          <p>
            Outbranch only researches real, verifiable entities. Try the official name, add the website, or describe
            the business in a sentence.
          </p>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Matching entities" className="grid gap-3 md:grid-cols-2">
          {candidates.map((c) => {
            const kind = entityKindSchema.safeParse(c.kind)
            const active = selected === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors",
                  active ? "border-primary ring-2 ring-primary/15" : "hover:border-border-strong",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <Badge variant={active ? "accent" : "muted"}>{kind.success ? ENTITY_KIND_LABELS[kind.data] : c.kind}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {c.parentName && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3" /> {c.parentName}
                    </span>
                  )}
                  {c.url && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <ExternalLink className="size-3" /> {c.url.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => restartResolution(projectId, refined))
          }}
        >
          <Input
            aria-label="Refine identifier"
            value={refined}
            onChange={(e) => setRefined(e.target.value)}
            placeholder="Refine: official name, website or description"
          />
          <Button type="submit" variant="outline" disabled={pending || refined.trim().length < 2}>
            Search again
          </Button>
        </form>
        {!notFound && (
          <Button
            size="lg"
            disabled={!selected || pending}
            onClick={() => selected && run(() => selectCandidate(projectId, selected))}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Research this entity <ArrowRight />
          </Button>
        )}
      </div>
    </section>
  )
}
