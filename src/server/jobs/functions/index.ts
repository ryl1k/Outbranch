import { brandResearchJob, resolveEntityJob } from "./brand"
import { discoveryJob } from "./discovery"
import { sweepStaleJobs } from "./sweeper"

export const functions = [resolveEntityJob, brandResearchJob, discoveryJob, sweepStaleJobs]
