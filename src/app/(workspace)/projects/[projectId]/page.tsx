import { AlertOctagon } from "lucide-react"
import { AnalysisConfigForm } from "@/components/research/analysis-config-form"
import { ConfirmedBrandCard } from "@/components/research/confirmed-brand-card"
import { userContextSchema } from "@/lib/schemas/project"
import { BrandVerification } from "@/components/research/brand-verification"
import { CandidatePicker } from "@/components/research/candidate-picker"
import { ResearchProgress } from "@/components/research/research-progress"
import { RetryButton } from "@/components/research/retry-button"
import { assertProjectAccess } from "@/server/auth/session"
import { getBrandVerification, getCandidates, getJobTimeline } from "@/server/projects/queries"

function serializeTimeline(jobs: Awaited<ReturnType<typeof getJobTimeline>>) {
  return {
    jobs: jobs.map((j) => ({ id: j.id, kind: j.kind, status: j.status, stage: j.stage })),
    events: jobs
      .flatMap((j) => j.events)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((e) => ({
        id: e.id,
        jobId: e.jobId,
        stage: e.stage,
        level: e.level,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      })),
  }
}

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params
  const { project } = await assertProjectAccess(projectId)
  const timeline = serializeTimeline(await getJobTimeline(projectId))
  const progress = (
    <ResearchProgress projectId={projectId} initialJobs={timeline.jobs} initialEvents={timeline.events} />
  )

  switch (project.stage) {
    case "INPUT":
    case "RESOLVING":
    case "RESEARCHING_BRAND": {
      const active = timeline.jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING")
      return (
        <div className="mx-auto max-w-3xl space-y-6">
          {!active && (
            <div className="flex flex-col gap-3 rounded-xl border bg-warning-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">Research is not running. It may have been interrupted or cancelled.</p>
              <RetryButton projectId={projectId} />
            </div>
          )}
          {progress}
        </div>
      )
    }

    case "NEEDS_SELECTION": {
      const candidates = await getCandidates(projectId)
      const explanation = [...timeline.events].reverse().find((e) => e.stage === "resolve.decide")?.message
      return (
        <CandidatePicker
          projectId={projectId}
          identifier={project.identifier}
          candidates={candidates}
          explanation={explanation}
        />
      )
    }

    case "NEEDS_CONFIRMATION": {
      const data = await getBrandVerification(projectId)
      if (!data) return progress
      return <BrandVerification projectId={projectId} data={data} />
    }

    case "CONFIGURING": {
      const data = await getBrandVerification(projectId)
      const ctx = userContextSchema.catch({}).parse(project.userContext ?? {})
      const stoppedEarly = timeline.events.findLast((e) => e.stage === "cultural" && e.level === "ERROR")
      return (
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {data && <ConfirmedBrandCard projectId={projectId} data={data} />}
          <section className="space-y-6">
            <div className="space-y-1.5">
              <p className="eyebrow">Analysis configuration</p>
              <h2 className="text-xl font-semibold">Where should Outbranch look?</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Outbranch plans which cultural domains to query in Qloo, turns the strongest relationships into
                commercial hypotheses, investigates the top ones and ranks them on explicit criteria.
              </p>
            </div>
            {stoppedEarly && (
              <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
                {stoppedEarly.message}
              </p>
            )}
            <div className="rounded-xl border bg-card p-5 shadow-soft sm:p-6">
              <AnalysisConfigForm
                projectId={projectId}
                initial={{
                  excludedCategories: ctx.excludedCategories?.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10),
                  objectives: ctx.objectives,
                  budgetRange: ctx.budgetRange,
                }}
              />
            </div>
          </section>
        </div>
      )
    }

    case "DISCOVERING":
      return <div className="mx-auto max-w-3xl">{progress}</div>

    case "FAILED": {
      const lastError = [...timeline.events].reverse().find((e) => e.level === "ERROR")
      return (
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start gap-4 rounded-xl border border-destructive/25 bg-destructive-soft p-5">
            <AlertOctagon className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold">Research stopped</h2>
                <p className="mt-1 text-sm text-foreground/80">
                  {lastError?.message ?? "The last research job did not complete."}
                </p>
              </div>
              <RetryButton projectId={projectId} />
            </div>
          </div>
          {progress}
        </div>
      )
    }

    default:
      return <div className="mx-auto max-w-3xl">{progress}</div>
  }
}
