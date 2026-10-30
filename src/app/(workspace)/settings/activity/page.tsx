import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { JOB_KIND, JOB_STATUS, jobDuration } from "@/components/workspace/job-labels"
import { PageHeader } from "@/components/workspace/primitives"
import { requireViewer } from "@/server/auth/session"
import { getBillingState, getWorkspaceActivity } from "@/server/billing/entitlements"
import { db } from "@/server/db"

export const metadata = { title: "Activity" }

const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" })

const TOTALS = [
  ["projects", "Research projects"],
  ["studies", "Studies completed"],
  ["opportunities", "Opportunities found"],
  ["deepDives", "Deep dives"],
  ["reports", "Reports"],
] as const

function Allowance({ label, used, limit, unlimited }: { label: string; used: number; limit: number; unlimited: boolean }) {
  const left = Math.max(0, limit - used)
  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground">{unlimited ? `${used} used` : `${used} of ${limit} used`}</span>
      </div>
      <p className="text-3xl font-semibold tabular-nums">{unlimited ? "Unlimited" : `${left} left`}</p>
      {!unlimited && <Progress value={Math.min(100, (used / limit) * 100)} className="h-2" aria-label={`${label}: ${used} of ${limit} used`} />}
    </div>
  )
}

export default async function WorkspaceActivityPage() {
  const viewer = await requireViewer()
  const workspaceId = viewer.workspace.id
  const [state, activity, jobs] = await Promise.all([
    getBillingState(workspaceId, { isGuest: viewer.user.isGuest }),
    getWorkspaceActivity(workspaceId),
    db.researchJob.findMany({
      where: { project: { workspaceId } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, kind: true, status: true, createdAt: true, startedAt: true, finishedAt: true, project: { select: { id: true, name: true } } },
    }),
  ])
  const unlimited = state.subscribed

  return (
    <div className="workspace-width mx-auto space-y-10 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow="Workspace"
        title="Activity"
        description="What this workspace has used, what is left on your plan and the latest research runs."
        actions={
          !unlimited && (
            <Link href="/settings/billing" className="text-sm text-primary-ink underline-offset-4 hover:underline">
              Need more? See plans
            </Link>
          )
        }
      />

      <section aria-labelledby="allowance" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="allowance" className="text-lg font-semibold">
            Plan allowance
          </h2>
          <p className="text-xs text-muted-foreground">{unlimited ? "Pro plan: no limits" : "Free plan"}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Allowance label="Research projects" used={state.usage.projects} limit={state.limits.projects} unlimited={unlimited} />
          <Allowance label="Deep dives" used={state.usage.deepDives} limit={state.limits.deepDives} unlimited={unlimited} />
        </div>
        {!unlimited && (
          <p className="text-xs text-muted-foreground">Deleting a project frees its slot. Failed and cancelled deep dives do not count.</p>
        )}
      </section>

      <section aria-labelledby="totals" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="totals" className="text-lg font-semibold">
            What you have produced
          </h2>
          <p className="text-xs text-muted-foreground">All time, with the last 30 days below</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOTALS.map(([key, label]) => (
            <div key={key} className="rounded-xl border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{activity[key].total}</dd>
              <dd className="text-xs text-muted-foreground">{activity[key].recent} in the last 30 days</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="runs" className="space-y-3">
        <h2 id="runs" className="text-lg font-semibold">
          Recent research runs
        </h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No research yet.{" "}
            <Link href="/projects/new" className="text-primary-ink underline-offset-4 hover:underline">
              Start your first study
            </Link>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/projects/${j.project.id}/activity`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{JOB_KIND[j.kind]}</span>
                    <span className="block truncate text-xs text-muted-foreground">{j.project.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground sm:w-44 sm:text-right">
                    {fmt.format(j.createdAt)} · {jobDuration(j.startedAt, j.finishedAt)}
                  </span>
                  <Badge variant={JOB_STATUS[j.status]} className="self-start sm:self-auto">
                    {j.status.toLowerCase()}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
