import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChevronDown, ExternalLink, Info, Link2 } from "lucide-react"
import { CategoryBadge, EvidenceStrengthBadge, LevelMeter } from "@/components/opportunities/badges"
import { OpportunityActions } from "@/components/opportunities/opportunity-actions"
import { ClaimStatusBadge } from "@/components/research/evidence"
import { ResearchProgress } from "@/components/research/research-progress"
import { Badge } from "@/components/ui/badge"
import { DataModeBadge } from "@/components/workspace/primitives"
import {
  commercialFindingsSchema,
  CRITERIA,
  CRITERIA_LABELS,
  deepDiveSchema,
  evaluationCriteriaSchema,
  NEGATIVE_CRITERIA,
  partnerListSchema,
  type OpportunityCategory,
} from "@/lib/schemas/discovery"
import { stringListSchema } from "@/lib/schemas/brand"
import { requireProjectRead } from "@/server/auth/session"
import { ENTITY_TYPE_LABELS, type QlooEntityType } from "@/server/providers/qloo/types"
import { getJobTimeline, getOpportunityDetail } from "@/server/projects/queries"

const SECTIONS = [
  ["summary", "Executive summary"],
  ["hypothesis", "Expansion hypothesis"],
  ["cultural", "Cultural evidence"],
  ["partners", "Potential partners"],
  ["mechanism", "Commercial mechanism"],
  ["market", "Market research"],
  ["competition", "Competitive landscape"],
  ["costs", "Costs & financial assumptions"],
  ["risks", "Risks & unknowns"],
  ["validation", "Validation strategy"],
  ["next", "Recommended next steps"],
  ["sources", "Sources"],
] as const

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })

function Section({ id, index, title, children }: { id: string; index: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 border-t pt-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold">
        <span className="font-mono text-xs text-muted-foreground">{String(index).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export default async function OpportunityPage({ params }: PageProps<"/projects/[projectId]/opportunities/[opportunityId]">) {
  const { projectId, opportunityId } = await params
  const { project } = await requireProjectRead(projectId)
  const detail = await getOpportunityDetail(projectId, opportunityId)
  if (!detail) notFound()
  const { opp, activeJob, contributorNames } = detail

  const criteria = evaluationCriteriaSchema.safeParse(opp.evaluations[0]?.criteria)
  const commercial = commercialFindingsSchema.omit({ claims: true }).partial().safeParse(opp.commercial ?? {})
  const deep = deepDiveSchema.safeParse(opp.deepDive)
  const partners = partnerListSchema.catch([]).parse(opp.partners)
  const risks = stringListSchema.catch([]).parse(opp.risks)
  const unknowns = stringListSchema.catch([]).parse(opp.unknowns)
  const relationships = opp.evidence.flatMap((e) => (e.relationship ? [e.relationship] : []))
  const insights = opp.evidence.flatMap((e) => (e.insight ? [e.insight] : []))
  const brandClaims = opp.evidence.flatMap((e) => (e.claim && !e.claim.opportunityId ? [e.claim] : []))
  const c = commercial.success && opp.commercialAt ? commercial.data : null
  const d = deep.success ? deep.data : null
  const timeline = activeJob ? await getJobTimeline(projectId, 1) : []

  return (
    <div className="space-y-8">
      <Link href={`/projects/${projectId}/opportunities`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All opportunities
      </Link>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {opp.rank && opp.status === "CANDIDATE" && (
              <Badge variant="default" className="font-mono">
                #{opp.rank}
              </Badge>
            )}
            <CategoryBadge category={opp.category as OpportunityCategory} />
            <EvidenceStrengthBadge strength={opp.evidenceStrength} />
            <Badge variant="rose">AI hypothesis</Badge>
            {opp.constraints && <span className="font-mono text-xs text-muted-foreground">iteration {opp.constraints.iteration}</span>}
          </div>
          <h1 className="font-editorial text-3xl leading-tight text-balance sm:text-4xl">{opp.title}</h1>
        </div>
        <OpportunityActions
          projectId={projectId}
          opportunityId={opp.id}
          shortlisted={opp.shortlistItems.length > 0}
          researching={Boolean(activeJob)}
          hasDeepDive={Boolean(d)}
        />
      </header>

      {activeJob && (
        <ResearchProgress
          projectId={projectId}
          title="Deep research in progress"
          initialJobs={timeline.map((j) => ({ id: j.id, kind: j.kind, status: j.status, stage: j.stage }))}
          initialEvents={timeline.flatMap((j) => j.events.map((e) => ({ id: e.id, jobId: e.jobId, stage: e.stage, level: e.level, message: e.message, createdAt: e.createdAt.toISOString() })))}
        />
      )}

      <div className="grid gap-10 lg:grid-cols-[200px_1fr_300px]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ol className="sticky top-6 space-y-1 text-sm">
            {SECTIONS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="flex gap-2 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <span className="font-mono text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 space-y-8">
          <Section id="summary" index={1} title="Executive summary">
            <p className="leading-relaxed">{d?.executiveSummary ?? opp.summary}</p>
            {!d && <Unavailable>Run “Research deeper” for a full executive summary, validation plan and financial assumptions.</Unavailable>}
          </Section>

          <Section id="hypothesis" index={2} title="Expansion hypothesis">
            <blockquote className="border-l-2 border-rose pl-4 font-editorial text-lg leading-relaxed">{opp.hypothesis}</blockquote>
          </Section>

          <Section id="cultural" index={3} title="Cultural evidence">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <DataModeBadge mode={project.dataMode} />
              <span>Qloo affinity reflects shared taste. It does not predict revenue or purchase intent.</span>
            </div>
            {relationships.length === 0 ? (
              <Unavailable>No Qloo relationships support this opportunity.</Unavailable>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Entity</th>
                      <th className="px-3 py-2 font-medium">Domain</th>
                      <th className="px-3 py-2 font-medium">Rank in query</th>
                      <th className="px-3 py-2 font-medium">Driven by (explainability)</th>
                      <th className="px-3 py-2 font-medium">Retrieved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {relationships.map((r) => {
                      const ex = r.explainability as { contributors?: { entityId: string; score: number }[] } | null
                      const top = [...(ex?.contributors ?? [])].sort((a, b) => b.score - a.score).slice(0, 2)
                      return (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-medium">{r.targetEntity.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{ENTITY_TYPE_LABELS[r.domain as QlooEntityType] ?? r.domain}</td>
                          <td className="px-3 py-2 font-mono text-xs">#{r.rank}</td>
                          <td className="px-3 py-2 text-xs">
                            {top.length
                              ? top.map((t) => `${contributorNames.get(t.entityId) ?? "seed"} (${t.score.toFixed(2)})`).join(", ")
                              : <span className="text-muted-foreground">Not reported</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{dateFmt.format(r.retrievedAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {insights.map((i) => (
              <div key={i.id} className="rounded-lg bg-rose-soft/50 p-3 text-sm">
                <p className="font-medium">{i.title}</p>
                <p className="mt-1 text-foreground/80">{i.summary}</p>
              </div>
            ))}
            {brandClaims.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Brand fit</p>
                <ul className="space-y-1 text-sm">
                  {brandClaims.map((cl) => (
                    <li key={cl.id} className="flex gap-2">
                      <ClaimStatusBadge status={cl.status} /> <span>{cl.statement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section id="partners" index={4} title="Potential partners">
            <p className="text-xs text-muted-foreground">All partners are proposals. None is an existing relationship unless a cited source says so.</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {partners.map((p) => (
                <li key={p.name} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-muted-foreground">Proposed</Badge>
                    {p.qlooEntityId && (
                      <Badge variant="sage">
                        <Link2 /> Qloo
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.role}</p>
                </li>
              ))}
              {c?.potentialPartners?.map((p) => (
                <li key={`c-${p.name}`} className="rounded-lg border border-dashed p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="muted">From commercial research</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="mechanism" index={5} title="Commercial mechanism">
            <p className="leading-relaxed">{opp.mechanism}</p>
            {c?.dependencies && c.dependencies.length > 0 && (
              <div className="text-sm">
                <p className="text-xs font-medium text-muted-foreground">Dependencies</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{c.dependencies.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </Section>

          <Section id="market" index={6} title="Market research">
            {d?.marketResearch || c?.marketConditions ? (
              <p className="leading-relaxed">{d?.marketResearch ?? c?.marketConditions}</p>
            ) : (
              <Unavailable>Market research has not been performed for this opportunity yet.</Unavailable>
            )}
            {c?.existingExamples && c.existingExamples.length > 0 && (
              <div className="text-sm">
                <p className="text-xs font-medium text-muted-foreground">Comparable precedents</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{c.existingExamples.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </Section>

          <Section id="competition" index={7} title="Competitive landscape">
            {d?.competitiveLandscape && <p className="leading-relaxed">{d.competitiveLandscape}</p>}
            {c?.competitors?.length ? (
              <ul className="divide-y rounded-lg border text-sm">
                {c.competitors.map((x) => (
                  <li key={x.name} className="p-3">
                    <span className="font-medium">{x.name}</span>
                    <span className="text-muted-foreground"> — {x.note}</span>
                  </li>
                ))}
              </ul>
            ) : (
              !d && <Unavailable>Competitors have not been researched yet.</Unavailable>
            )}
          </Section>

          <Section id="costs" index={8} title="Costs & financial assumptions">
            {c?.costs && (
              <p className="text-sm">
                <span className="font-medium">Cost drivers: </span>
                {c.costs}
              </p>
            )}
            {c?.licensing && (
              <p className="text-sm">
                <span className="font-medium">Licensing: </span>
                {c.licensing}
              </p>
            )}
            {d?.financialAssumptions.length ? (
              <ul className="divide-y rounded-lg border text-sm">
                {d.financialAssumptions.map((a) => (
                  <li key={a.assumption} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-3">
                    <Badge variant={a.basis === "SOURCED" ? "sage" : a.basis === "ESTIMATE" ? "warning" : "muted"} className="shrink-0">
                      {a.basis === "SOURCED" ? "Sourced" : a.basis === "ESTIMATE" ? "Estimate" : "Unknown"}
                    </Badge>
                    <div>
                      <p>{a.assumption}</p>
                      <p className="text-xs text-muted-foreground">{a.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !c && <Unavailable>No cost information yet. Outbranch does not estimate figures without evidence.</Unavailable>
            )}
          </Section>

          <Section id="risks" index={9} title="Risks & unknowns">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Risks</p>
                <ul className="space-y-2 text-sm">
                  {(d?.keyRisks ?? risks.map((r) => ({ risk: r, mitigation: "" }))).map((r) => (
                    <li key={r.risk} className="rounded-lg bg-destructive-soft/50 p-2.5">
                      {r.risk}
                      {r.mitigation && <p className="mt-1 text-xs text-muted-foreground">Mitigation: {r.mitigation}</p>}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Unknowns to validate</p>
                <ul className="space-y-2 text-sm">
                  {[...unknowns, ...(c?.uncertainties ?? [])].map((u) => (
                    <li key={u} className="rounded-lg bg-warning-soft/60 p-2.5">{u}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="validation" index={10} title="Validation strategy">
            {d?.validationStrategy.length ? (
              <ol className="space-y-3">
                {d.validationStrategy.map((v, i) => (
                  <li key={v.step} className="flex gap-3 rounded-lg border p-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs text-accent-foreground">{i + 1}</span>
                    <div className="space-y-1">
                      <p className="font-medium">{v.step}</p>
                      <p className="text-muted-foreground">Success signal: {v.successSignal}</p>
                      <Badge variant="muted" className="capitalize">{v.effort} effort</Badge>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Unavailable>Run “Research deeper” to generate a validation plan.</Unavailable>
            )}
          </Section>

          <Section id="next" index={11} title="Recommended next steps">
            <ul className="space-y-2 text-sm">
              {(d?.nextSteps ?? [opp.nextAction]).map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Outbranch never contacts partners or commits spend on your behalf.</p>
          </Section>

          <Section id="sources" index={12} title="Sources">
            {opp.claims.length === 0 ? (
              <Unavailable>No external sources yet for this opportunity.</Unavailable>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {opp.claims.map((cl) => (
                  <li key={cl.id} className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 gap-1.5">
                      <ClaimStatusBadge status={cl.status} />
                      {cl.evidence[0]?.role === "CONTRADICTS" && <Badge variant="danger">Contradicts</Badge>}
                    </div>
                    <div className="min-w-0">
                      <p>{cl.statement}</p>
                      {cl.source?.url && (
                        <a href={cl.source.url} target="_blank" rel="noreferrer noopener" className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-ink">
                          {cl.source.publisher ?? cl.source.title} · retrieved {dateFmt.format(cl.source.retrievedAt)} <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <details className="group rounded-xl border bg-card p-4 shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <span className="font-heading text-sm font-semibold">Outbranch assessment</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            {criteria.success ? (
              <ul className="mt-3 space-y-3">
                {CRITERIA.map((k) => {
                  const a = criteria.data[k]
                  return (
                    <li key={k} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{CRITERIA_LABELS[k]}</span>
                        <Badge variant={a.basis === "MEASURED" ? "sage" : a.basis === "MODEL_ASSESSED" ? "rose" : "muted"} className="text-[10px]">
                          {a.basis === "MEASURED" ? "Measured" : a.basis === "MODEL_ASSESSED" ? "Model" : "No data"}
                        </Badge>
                      </div>
                      <LevelMeter level={a.level} inverse={NEGATIVE_CRITERIA.includes(k)} unavailable={a.basis === "UNAVAILABLE"} />
                      <p className="text-xs text-muted-foreground">{a.rationale}</p>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Not evaluated yet.</p>
            )}
            <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Levels are model assessments unless marked measured. Outbranch never states success probabilities.
            </p>
          </details>
        </aside>
      </div>
    </div>
  )
}
