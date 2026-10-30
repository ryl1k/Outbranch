import "server-only"
import { eventType, Inngest } from "inngest"
import { z } from "zod"
import { env } from "@/server/env"

export const inngest = new Inngest({
  id: "outbranch",
  // Local development talks to `npx inngest-cli dev`; production needs signing keys.
  isDev: !env.INNGEST_SIGNING_KEY,
  checkpointing: { maxRuntime: "240s" },
})

const jobRef = z.object({ projectId: z.string(), jobId: z.string(), workspaceId: z.string() })

export const events = {
  resolveRequested: eventType("research/resolve.requested", { schema: jobRef }),
  brandRequested: eventType("research/brand.requested", { schema: jobRef }),
  discoveryRequested: eventType("research/discovery.requested", { schema: jobRef }),
  deepDiveRequested: eventType("research/deep-dive.requested", {
    schema: jobRef.extend({ opportunityId: z.string() }),
  }),
  reportRequested: eventType("research/report.requested", {
    schema: jobRef.extend({ opportunityId: z.string().nullable() }),
  }),
  jobCancelled: eventType("research/job.cancelled", { schema: z.object({ jobId: z.string() }) }),
}

/** Shared function options: bounded concurrency per workspace and cancellation by job id. */
export function jobOptions(id: string) {
  return {
    id,
    retries: 2 as const,
    concurrency: [{ limit: 2, key: "event.data.workspaceId" }, { limit: 6 }] as [
      { limit: number; key: string },
      { limit: number },
    ],
    cancelOn: [{ event: events.jobCancelled.name, match: "data.jobId" }],
  }
}
