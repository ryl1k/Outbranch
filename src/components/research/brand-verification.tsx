"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Check,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { ClaimStatus } from "@/generated/prisma/enums"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ENTITY_KIND_LABELS, entityKindSchema } from "@/lib/schemas/brand"
import { cn } from "@/lib/utils"
import {
  addUserContext,
  confirmProfile,
  retryBrandResearch,
  setClaimRejected,
  setCulturalRefRemoved,
  updateProfile,
} from "@/server/projects/actions"
import type { BrandVerification as Data } from "@/server/projects/queries"
import { ClaimStatusBadge, EvidenceLegend } from "./evidence"

const TOPIC_LABELS: Record<string, string> = {
  identity: "Identity",
  products: "Products & services",
  audience: "Audience",
  markets: "Markets",
  positioning: "Positioning",
  collaborations: "Collaborations",
  competitors: "Competitors",
  culture: "Culture",
}

type Result = { ok: boolean; error?: string } | undefined

function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<Result>, success?: string) =>
    start(async () => {
      const res = await fn()
      if (res && !res.ok) toast.error(res.error ?? "Something went wrong")
      else {
        if (success) toast.success(success)
        router.refresh()
      }
    })
  return { pending, run }
}

function EditableText({
  label,
  value,
  onSave,
  multiline = true,
}: {
  label: string
  value: string | null
  onSave: (v: string) => void
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  return (
    <div className="group space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {!editing && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Edit ${label.toLowerCase()}`}
            className="opacity-60 group-hover:opacity-100"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            autoFocus
            rows={multiline ? 4 : 1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={label}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(draft)
                setEditing(false)
              }}
            >
              <Check /> Save correction
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className={cn("text-sm leading-relaxed", !value && "text-muted-foreground italic")}>{value || "Not found"}</p>
      )}
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-rose" aria-hidden />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground italic">Nothing found in public sources</p>
      )}
    </div>
  )
}

export function BrandVerification({ projectId, data }: { projectId: string; data: Data }) {
  const { pending, run } = useAction()
  const [context, setContext] = useState("")
  const { profile } = data
  const kind = entityKindSchema.safeParse(profile.entityKind)

  const counts = useMemo(() => {
    const c: Partial<Record<ClaimStatus, number>> = {}
    for (const claim of data.claims) c[claim.status] = (c[claim.status] ?? 0) + 1
    return c
  }, [data.claims])

  const claimsByTopic = useMemo(() => {
    const groups = new Map<string, Data["claims"]>()
    for (const claim of data.claims) {
      const key = claim.topic.startsWith("user:") ? "your input" : claim.topic
      groups.set(key, [...(groups.get(key) ?? []), claim])
    }
    return [...groups.entries()]
  }, [data.claims])

  const uncertainCount = (counts.UNCERTAIN ?? 0) + (counts.INFERRED ?? 0)

  return (
    <div className="space-y-6 pb-28">
      <section className="rounded-xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">Brand profile · draft v{profile.version}</p>
            <h2 className="text-2xl font-semibold">{profile.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{kind.success ? ENTITY_KIND_LABELS[kind.data] : profile.entityKind}</Badge>
              {profile.officialUrl && (
                <a
                  href={profile.officialUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary-ink"
                >
                  {profile.officialUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink className="size-3" />
                </a>
              )}
              {profile.qlooEntity ? (
                <Badge variant="sage">
                  <Link2 /> In Qloo as “{profile.qlooEntity.name}”
                </Badge>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="warning" className="cursor-help">
                      <Link2Off /> Not in Qloo
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Qloo has no entity for this brand. Cultural analysis will rely on its resolved cultural references
                    and themes, with reduced confidence.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                Sources ({data.sources.length})
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Sources</SheetTitle>
                <SheetDescription>Public pages retrieved during brand research.</SheetDescription>
              </SheetHeader>
              <ol className="space-y-3 px-4 pb-6">
                {data.sources.map((s, i) => (
                  <li key={s.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      [{i + 1}] {s.publisher} · {new Date(s.retrievedAt).toLocaleDateString()}
                    </p>
                    <a
                      href={s.url ?? undefined}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 block font-medium hover:text-primary-ink"
                    >
                      {s.title}
                    </a>
                    {s.excerpt && <p className="mt-1 text-xs text-muted-foreground">“{s.excerpt}”</p>}
                  </li>
                ))}
              </ol>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <EditableText
            label="Summary"
            value={profile.summary}
            onSave={(v) => run(() => updateProfile(projectId, { summary: v }), "Summary corrected")}
          />
          <div className="space-y-5">
            <EditableText
              label="Industry"
              multiline={false}
              value={profile.industry}
              onSave={(v) => run(() => updateProfile(projectId, { industry: v || null }), "Industry corrected")}
            />
            <EditableText
              label="Cultural positioning"
              value={profile.positioning}
              onSave={(v) => run(() => updateProfile(projectId, { positioning: v || null }), "Positioning corrected")}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ListBlock
          title="Products"
          items={data.products.map((p) => (
            <>
              <span className="font-medium">{p.name}</span>
              {p.description && <span className="text-muted-foreground"> — {p.description}</span>}
            </>
          ))}
        />
        <ListBlock title="Audiences" items={data.audiences} />
        <ListBlock title="Markets" items={data.markets} />
        <ListBlock title="Competitors" items={data.competitors} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Cultural references</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Entities linked to the brand in research. Only references resolved in Qloo can seed cultural analysis.
          </p>
          <ul className="mt-4 divide-y">
            {data.culturalRefs.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground italic">No cultural references were found.</li>
            )}
            {data.culturalRefs.map((ref) => (
              <li key={ref.name} className={cn("flex items-start gap-3 py-3", ref.removed && "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-sm font-medium", ref.removed && "line-through")}>{ref.name}</span>
                    <Badge variant="muted" className="font-mono text-[10px]">
                      {ref.type.replace("_", " ")}
                    </Badge>
                    {ref.qlooId ? (
                      <Badge variant="sage">
                        <Link2 /> Qloo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Unresolved
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ref.why}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={ref.removed ? `Restore ${ref.name}` : `Remove ${ref.name}`}
                  onClick={() => run(() => setCulturalRefRemoved(projectId, ref.name, !ref.removed))}
                >
                  {ref.removed ? <RotateCcw /> : <X />}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Themes</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AI-extracted themes. Only those matched to a real Qloo tag are used as tag signals.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {data.themes.map((t) => (
                <li key={t.id}>
                  {t.tag ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="sage" className="cursor-help">
                          <Tag /> {t.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Qloo tag: <span className="font-mono">{t.tag.name}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t.label}
                      <span className="sr-only"> (no Qloo tag match)</span>
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Collaborations on record</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {data.collaborations.length === 0 && (
                <li className="text-muted-foreground italic">None found in public sources.</li>
              )}
              {data.collaborations.map((c, i) => (
                <li key={i}>
                  <span className="font-medium">{c.partner}</span>
                  {c.year && <span className="font-mono text-xs text-muted-foreground"> · {c.year}</span>}
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold">Claims & evidence</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Remove anything incorrect. Removed claims are excluded from opportunity discovery.
            </p>
          </div>
          <EvidenceLegend counts={counts} />
        </div>
        <div className="mt-5 space-y-6">
          {claimsByTopic.map(([topic, claims]) => (
            <div key={topic}>
              <h4 className="eyebrow mb-2">{TOPIC_LABELS[topic] ?? topic}</h4>
              <ul className="divide-y rounded-lg border">
                {claims.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex flex-col gap-2 p-3 sm:flex-row sm:items-start",
                      c.status === "REJECTED" && "bg-muted/40",
                    )}
                  >
                    <div className="shrink-0">
                      <ClaimStatusBadge status={c.status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", c.status === "REJECTED" && "text-muted-foreground line-through")}>
                        {c.statement}
                      </p>
                      {c.source?.url && (
                        <a
                          href={c.source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-ink"
                        >
                          {c.source.publisher ?? c.source.title} <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    {c.status !== "USER_PROVIDED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        className="self-start text-muted-foreground"
                        onClick={() => run(() => setClaimRejected(projectId, c.id, c.status !== "REJECTED"))}
                      >
                        {c.status === "REJECTED" ? (
                          <>
                            <RotateCcw /> Restore
                          </>
                        ) : (
                          <>
                            <Trash2 /> Remove
                          </>
                        )}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <form
          className="mt-6 space-y-2 border-t pt-5"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => addUserContext(projectId, context), "Context added")
            setContext("")
          }}
        >
          <label htmlFor="add-context" className="text-sm font-medium">
            Add missing context
          </label>
          <Textarea
            id="add-context"
            rows={2}
            maxLength={600}
            placeholder="e.g. We launched in Japan in 2025 and are exploring licensing."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <Button type="submit" variant="outline" size="sm" disabled={pending || context.trim().length < 3}>
            <Plus /> Add as your input
          </Button>
        </form>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {uncertainCount > 0
              ? `${uncertainCount} inferred or uncertain claims. Review them before continuing.`
              : "Review the profile. Discovery uses exactly what you confirm here."}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => run(() => retryBrandResearch(projectId))}>
              <RotateCcw /> Re-run research
            </Button>
            <Button size="lg" disabled={pending} onClick={() => run(() => confirmProfile(projectId), "Profile confirmed")}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Confirm profile
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
