import { db } from "@/server/db"
import { loadDiscoveryContext } from "@/server/research/discovery/context"
import { persistCommercialResearch, researchOpportunity } from "@/server/research/discovery/commercial"
import { gatherDomain, interpretCulture, loadSeeds, planDomains } from "@/server/research/discovery/cultural"
import { evaluateOpportunities } from "@/server/research/discovery/evaluate"
import { generateOpportunities } from "@/server/research/discovery/opportunities"
import { events, inngest, jobOptions } from "../client"
import { jobContext, markFailed, markFinished, markRunning, restoreProjectStage } from "../lifecycle"

/** How many top hypotheses get web-based commercial investigation per run. */
const INVESTIGATE_TOP = 4

export const discoveryJob = inngest.createFunction(
  { ...jobOptions("opportunity-discovery"), triggers: [events.discoveryRequested] },
  async ({ event, step }) => {
    const { projectId, jobId } = event.data
    const job = jobContext(jobId, projectId)
    try {
      const constraintsId = await step.run("start", async () => {
        await markRunning(jobId)
        await db.project.update({ where: { id: projectId }, data: { stage: "DISCOVERING" } })
        const row = await db.researchJob.findUniqueOrThrow({ where: { id: jobId } })
        return row.constraintsId
      })
      const load = () => loadDiscoveryContext(projectId, constraintsId)

      const plan = await step.run("plan-domains", async () => planDomains(job, await load()))

      const seeds = await step.run("load-seeds", async () => {
        const s = await loadSeeds(await load())
        await job.note(
          "cultural",
          `Using ${s.entities.length} Qloo entities and ${s.tags.length} verified tags as taste signals`,
          s.entities.length + s.tags.length ? "INFO" : "WARNING",
        )
        return s
      })

      if (!seeds.entities.length && !seeds.tags.length) {
        await step.run("insufficient-evidence", async () => {
          await job.note(
            "cultural",
            "No confirmed Qloo entities or tags are available for this brand, so culturally grounded discovery cannot run. Add or restore cultural references, then retry.",
            "ERROR",
          )
          await db.project.update({ where: { id: projectId }, data: { stage: "CONFIGURING" } })
          await markFinished(jobId, "PARTIAL", "Stopped: insufficient cultural evidence")
        })
        return { outcome: "insufficient-evidence" }
      }

      // One durable step per domain: a slow or failing Qloo query only retries itself.
      const cultural = { total: 0, failures: [] as string[] }
      for (const domain of plan.domains) {
        const res = await step.run(`qloo-${domain.type}`, async () => gatherDomain(job, await load(), domain.type, seeds))
        cultural.total += res.count
        if (!res.ok) cultural.failures.push(domain.type)
      }

      // Every Qloo query failed or came back empty: generation would discard every
      // hypothesis for lack of evidence, so stop honestly instead of spending on it.
      const usable = await step.run("check-cultural-evidence", async () =>
        cultural.total > 0 || (await db.culturalRelationship.count({ where: { projectId } })) > 0,
      )
      if (!usable) {
        await step.run("no-cultural-evidence", async () => {
          await job.note(
            "cultural",
            `Qloo returned no cultural relationships${cultural.failures.length ? " (some queries failed)" : ""}. Discovery stopped before generating unsupported hypotheses. Try again later or broaden the cultural references.`,
            "ERROR",
          )
          await restoreProjectStage(projectId, "DISCOVERY")
          await markFinished(jobId, "PARTIAL", "Stopped: no cultural evidence returned")
        })
        return { outcome: "no-cultural-evidence" }
      }
      await step.run("cultural-insights", async () => interpretCulture(job, await load()))
      const generated = await step.run("generate", async () => generateOpportunities(job, await load()))

      // Preliminary evaluation decides which hypotheses deserve commercial research,
      // so the best-ranked ideas are also the best-researched ones.
      await step.run("evaluate-preliminary", async () => evaluateOpportunities(job, await load(), generated.opportunityIds))
      const toInvestigate = await step.run("select-for-investigation", async () =>
        (
          await db.opportunity.findMany({
            where: { id: { in: generated.opportunityIds }, status: "CANDIDATE" },
            orderBy: { rank: "asc" },
            take: INVESTIGATE_TOP,
            select: { id: true },
          })
        ).map((o) => o.id),
      )
      if (toInvestigate.length) {
        await step.run("commercial-start", () =>
          job.stage("commercial", `Investigating the commercial case for the top ${toInvestigate.length} hypotheses`),
        )
      }
      const brandName = await step.run("brand-name", async () => (await load()).profile.name)
      const investigations = await Promise.all(
        toInvestigate.map((id) =>
          step
            .run(`investigate-${id}`, () => researchOpportunity(job, id, brandName))
            .then((data) => step.run(`persist-investigation-${id}`, () => persistCommercialResearch(job, id, data)))
            .then(() => true)
            .catch(() => false),
        ),
      )
      const failedInvestigations = investigations.filter((ok) => !ok).length

      const investigated = toInvestigate.filter((_, i) => investigations[i])
      if (investigated.length) {
        await step.run("evaluate", async () => evaluateOpportunities(job, await load(), investigated))
      }

      await step.run("finish", async () => {
        const partial = failedInvestigations > 0 || cultural.failures.length > 0
        if (failedInvestigations) {
          await job.note("commercial", `${failedInvestigations} commercial investigations failed and can be retried`, "WARNING")
        }
        await db.project.update({ where: { id: projectId }, data: { stage: "READY" } })
        await markFinished(
          jobId,
          partial ? "PARTIAL" : "SUCCEEDED",
          `${generated.opportunityIds.length} opportunities ranked${partial ? " (some research stages incomplete)" : ""}`,
        )
      })
      return { outcome: "ready", opportunities: generated.opportunityIds.length }
    } catch (error) {
      await step.run("mark-failed", async () => {
        await markFailed(jobId, error)
        await restoreProjectStage(projectId, "DISCOVERY")
      })
      return { outcome: "failed" }
    }
  },
)
