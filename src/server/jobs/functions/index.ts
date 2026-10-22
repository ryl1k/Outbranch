import { brandResearchJob, resolveEntityJob } from "./brand"
import { deepDiveJob } from "./deep-dive"
import { discoveryJob } from "./discovery"
import { sweepStaleJobs } from "./sweeper"

export const functions = [resolveEntityJob, brandResearchJob, discoveryJob, deepDiveJob, sweepStaleJobs]
