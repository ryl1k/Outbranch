import { CheckCircle2, CircleDashed } from "lucide-react"
import { UsageTable } from "@/components/workspace/usage-table"
import { PageHeader } from "@/components/workspace/primitives"
import { providerStatus } from "@/server/env"
import { requireViewer } from "@/server/auth/session"
import { MODELS } from "@/server/providers/anthropic/models"
import { usageSummary } from "@/server/usage/summary"

export const metadata = { title: "Usage & providers" }

export default async function UsagePage() {
  const viewer = await requireViewer()
  const status = providerStatus()
  const usage = await usageSummary({ project: { workspaceId: viewer.workspace.id } })
  const providers = [
    ["Anthropic Claude", status.anthropic, `Reasoning ${MODELS.reasoning} · research ${MODELS.research} · fast ${MODELS.fast}`],
    ["Qloo Taste AI", status.qloo || status.mode === "fixture", status.mode === "fixture" ? "Fixture mode: simulated, clearly labeled data" : "Live Insights API"],
  ] as const

  return (
    <div className="workspace-width mx-auto space-y-10 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader eyebrow="Workspace" title="Usage & providers" description="Provider configuration and the cost of research across this workspace." />
      <section className="grid gap-3 sm:grid-cols-2">
        {providers.map(([name, ok, detail]) => (
          <div key={name} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            {ok ? <CheckCircle2 className="mt-0.5 size-5 text-success" /> : <CircleDashed className="mt-0.5 size-5 text-muted-foreground" />}
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{ok ? detail : "Not configured"}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Workspace usage</h2>
        <UsageTable usage={usage} />
      </section>
    </div>
  )
}
