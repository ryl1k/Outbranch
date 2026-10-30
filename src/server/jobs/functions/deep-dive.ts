import { db } from "@/server/db"
import { persistCommercialResearch, researchOpportunity } from "@/server/research/discovery/commercial"
import { loadDiscoveryContext } from "@/server/research/discovery/context"
import { writeDeepDive } from "@/server/research/discovery/deep-dive"
import { evaluateOpportunities } from "@/server/research/discovery/evaluate"
import { events, inngest, jobOptions } from "../client"
import { jobContext, markFailed, markFinished, markRunning } from "../lifecycle"

/** "Research deeper": commercial investigation (if missing), deep dive, re-evaluation. */
export const deepDiveJob = inngest.createFunction(
  { ...jobOptions("opportunity-deep-dive"), triggers: [events.deepDiveRequested] },
  async ({ event, step }) => {
    const { projectId, jobId, opportunityId } = event.data
    const job = jobContext(jobId, projectId)
    try {
      const { constraintsId, investigated, brandName } = await step.run("start", async () => {
        await markRunning(jobId)
        const opp = await db.opportunity.findUniqueOrThrow({ where: { id: opportunityId } })
        const profile = await db.brandProfile.findUniqueOrThrow({ where: { projectId } })
        await job.note("deep-dive", `Deep research on “${opp.title}”`)
        return { constraintsId: opp.constraintsId, investigated: Boolean(opp.commercialAt), brandName: profile.name }
      })
      const load = () => loadDiscoveryContext(projectId, constraintsId)

      if (!investigated) {
        await step.run("commercial-start", () => job.stage("commercial", "Investigating the commercial case"))
        const research = await step.run("commercial-research", () => researchOpportunity(job, opportunityId, brandName))
        await step.run("commercial-persist", () => persistCommercialResearch(job, opportunityId, research))
      }
      await step.run("write-deep-dive", async () => writeDeepDive(job, await load(), opportunityId))
      await step.run("re-evaluate", async () => evaluateOpportunities(job, await load(), [opportunityId]))
      await step.run("finish", () => markFinished(jobId, "SUCCEEDED", "Deep dive ready"))
    } catch (error) {
      await step.run("mark-failed", () => markFailed(jobId, error))
    }
  },
)
