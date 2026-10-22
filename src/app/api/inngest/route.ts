import { serve } from "inngest/next"
import { inngest } from "@/server/jobs/client"
import { functions } from "@/server/jobs/functions"

// Each Inngest step is a separate short invocation; this bounds a single step.
export const maxDuration = 300

export const { GET, POST, PUT } = serve({ client: inngest, functions })
