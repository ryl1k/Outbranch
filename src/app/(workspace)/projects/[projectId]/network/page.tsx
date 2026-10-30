import { Share2 } from "lucide-react"
import { NetworkExplorer } from "@/components/network/network-explorer"
import { DataModeBadge, EmptyState } from "@/components/workspace/primitives"
import { assertProjectReadAccess } from "@/server/auth/session"
import { loadCulturalGraph } from "@/server/graph/load"

export const metadata = { title: "Cultural network" }

export default async function NetworkPage({ params }: PageProps<"/projects/[projectId]/network">) {
  const { projectId } = await params
  const { project } = await assertProjectReadAccess(projectId)
  const graph = await loadCulturalGraph(projectId)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Cultural opportunity network</p>
          <h2 className="text-xl font-semibold">From one origin to many growth paths</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Select any node to inspect its evidence. Selecting an opportunity traces the evidence chain back to the brand.
          </p>
        </div>
        <DataModeBadge mode={project.dataMode} />
      </div>
      {graph.nodes.length <= 1 ? (
        <EmptyState icon={Share2} title="No network yet" description="Run discovery to map cultural relationships." />
      ) : (
        <NetworkExplorer graph={graph} projectId={projectId} />
      )}
    </div>
  )
}
