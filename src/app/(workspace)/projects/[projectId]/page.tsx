import { AlertOctagon } from "lucide-react"
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
    case "RESEARCHING_BRAND":
      return <div className="mx-auto max-w-3xl">{progress}</div>

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
