import { AuthError, assertProjectAccess } from "@/server/auth/session"
import { db } from "@/server/db"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const POLL_MS = 1500
const MAX_STREAM_MS = 280_000

/**
 * Server-Sent Events stream of research progress. Events are read from the
 * database, so reconnecting with `?after=<cursor>` resumes without gaps.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/projects/[projectId]/events">) {
  const { projectId } = await params
  try {
    await assertProjectAccess(projectId)
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    return Response.json({ error: "Not available" }, { status })
  }

  const after = new URL(request.url).searchParams.get("after")
  let cursor = after ? new Date(after) : new Date(0)
  if (Number.isNaN(cursor.getTime())) cursor = new Date(0)
  const encoder = new TextEncoder()
  const started = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      let lastJobState = ""
      try {
        while (!request.signal.aborted && Date.now() - started < MAX_STREAM_MS) {
          const [events, jobs] = await Promise.all([
            db.researchEvent.findMany({
              where: { projectId, createdAt: { gt: cursor } },
              orderBy: { createdAt: "asc" },
              take: 100,
              select: { id: true, jobId: true, stage: true, level: true, message: true, createdAt: true },
            }),
            db.researchJob.findMany({
              where: { projectId },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: { id: true, kind: true, status: true, stage: true },
            }),
          ])
          if (events.length) {
            cursor = events[events.length - 1].createdAt
            send("events", events)
          }
          const jobState = JSON.stringify(jobs)
          if (jobState !== lastJobState) {
            lastJobState = jobState
            send("jobs", jobs)
          }
          if (!jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING") && !events.length) {
            send("idle", { at: new Date().toISOString() })
            break
          }
          controller.enqueue(encoder.encode(": keepalive\n\n"))
          await new Promise((r) => setTimeout(r, POLL_MS))
        }
      } catch (error) {
        console.error("[sse] stream error", error)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  })
}
