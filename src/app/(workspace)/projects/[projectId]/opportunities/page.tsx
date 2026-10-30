import { Lightbulb } from "lucide-react"
import { PortfolioView, RefineSheet } from "@/components/opportunities/portfolio-view"
import { EmptyState } from "@/components/workspace/primitives"
import { assertProjectReadAccess } from "@/server/auth/session"
import { getOpportunityPortfolio } from "@/server/projects/queries"
import { constraintsToConfig } from "@/server/projects/presenters"

export const metadata = { title: "Opportunities" }

export default async function OpportunitiesPage({ params }: PageProps<"/projects/[projectId]/opportunities">) {
  const { projectId } = await params
  await assertProjectReadAccess(projectId)
  const portfolio = await getOpportunityPortfolio(projectId)
  const active = portfolio.opportunities.filter((o) => o.status === "CANDIDATE")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Opportunity portfolio</p>
          <h2 className="text-xl font-semibold">
            {active.length} ranked opportunities
            {portfolio.latestConstraints && (
              <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                iteration {portfolio.latestConstraints.iteration}
              </span>
            )}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Ranked by explicit criteria and the evidence actually collected. Partners are proposals, not existing
            relationships.
          </p>
        </div>
        <RefineSheet projectId={projectId} initial={constraintsToConfig(portfolio.latestConstraints)} />
      </div>
      {portfolio.opportunities.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No opportunities yet" description="Run discovery from the project overview." />
      ) : (
        <PortfolioView projectId={projectId} opportunities={portfolio.opportunities} />
      )}
    </div>
  )
}
