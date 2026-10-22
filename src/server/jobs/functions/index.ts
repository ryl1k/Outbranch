import { brandResearchJob, resolveEntityJob } from "./brand"
import { sweepStaleJobs } from "./sweeper"

export const functions = [resolveEntityJob, brandResearchJob, sweepStaleJobs]
