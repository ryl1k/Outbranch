import "server-only"
import { NonRetriableError } from "inngest"
import type { EventLevel, JobKind, Prisma } from "@/generated/prisma/client"
import { db } from "@/server/db"
import { ProviderResponseError, ProviderUnavailableError } from "@/server/providers/errors"
import { events, inngest } from "./client"

export class JobCancelledError extends NonRetriableError {
  constructor(jobId: string) {
    super(`Job ${jobId} was cancelled`)
  }
}

const TRIGGERS = {
  RESOLVE_ENTITY: events.resolveRequested,
  BRAND_RESEARCH: events.brandRequested,
  DISCOVERY: events.discoveryRequested,
} as const

/** Create a job row and enqueue its Inngest event. Never runs research inline. */
export async function enqueueJob(input: {
  projectId: string
  workspaceId: string
  kind: JobKind
  constraintsId?: string
  opportunityId?: string
}) {
  const active = await db.researchJob.findFirst({
    where: {
      projectId: input.projectId,
      kind: input.kind,
      opportunityId: input.opportunityId ?? null,
      status: { in: ["QUEUED", "RUNNING"] },
    },
  })
  if (active) return active

  const job = await db.researchJob.create({
    data: {
      projectId: input.projectId,
      kind: input.kind,
      constraintsId: input.constraintsId,
      opportunityId: input.opportunityId,
    },
  })
  const ref = { projectId: input.projectId, jobId: job.id, workspaceId: input.workspaceId }
  const event =
    input.kind === "DEEP_DIVE"
      ? events.deepDiveRequested.create({ ...ref, opportunityId: input.opportunityId! })
      : input.kind === "REPORT"
        ? events.reportRequested.create({ ...ref, opportunityId: input.opportunityId ?? null })
        : TRIGGERS[input.kind].create(ref)

  try {
    const { ids } = await inngest.send(event)
    return db.researchJob.update({ where: { id: job.id }, data: { inngestEventId: ids[0] } })
  } catch (error) {
    await db.researchJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: "Could not reach the background job service", finishedAt: new Date() },
    })
    throw error
  }
}

/**
 * After a job stops without its own handler running (cancellation, sweeper),
 * put the project back in a stage the UI can act on.
 */
export async function restoreProjectStage(projectId: string, kind: JobKind) {
  if (kind === "RESOLVE_ENTITY" || kind === "BRAND_RESEARCH") {
    await db.project.update({ where: { id: projectId }, data: { stage: "FAILED" } })
  } else if (kind === "DISCOVERY") {
    const existing = await db.opportunity.count({ where: { projectId, status: "CANDIDATE" } })
    await db.project.update({ where: { id: projectId }, data: { stage: existing ? "READY" : "CONFIGURING" } })
  }
}

export async function requestCancel(jobId: string) {
  const job = await db.researchJob.update({
    where: { id: jobId },
    data: { cancelRequestedAt: new Date(), status: "CANCELLED", finishedAt: new Date() },
  })
  await emit(jobId, job.projectId, "cancelled", "Research cancelled by user", "WARNING")
  await restoreProjectStage(job.projectId, job.kind)
  await inngest.send(events.jobCancelled.create({ jobId }))
  return job
}

export async function emit(
  jobId: string,
  projectId: string,
  stage: string,
  message: string,
  level: EventLevel = "INFO",
  data?: Prisma.InputJsonValue,
) {
  await db.researchEvent.create({ data: { jobId, projectId, stage, message, level, data } })
}

/**
 * Per-job helper handed to each pipeline. Every stage boundary checks for
 * cancellation so a cancelled job stops making provider calls promptly.
 */
export function jobContext(jobId: string, projectId: string) {
  return {
    jobId,
    projectId,
    usage: (operation: string) => ({ projectId, jobId, operation }),
    async stage(stage: string, message: string, data?: Prisma.InputJsonValue) {
      await assertActive(jobId)
      await db.researchJob.update({ where: { id: jobId }, data: { stage } })
      await emit(jobId, projectId, stage, message, "INFO", data)
    },
    note: (stage: string, message: string, level: EventLevel = "INFO", data?: Prisma.InputJsonValue) =>
      emit(jobId, projectId, stage, message, level, data),
  }
}

export type JobContext = ReturnType<typeof jobContext>

export async function assertActive(jobId: string) {
  const job = await db.researchJob.findUnique({ where: { id: jobId }, select: { cancelRequestedAt: true } })
  if (!job || job.cancelRequestedAt) throw new JobCancelledError(jobId)
}

export async function markRunning(jobId: string) {
  await assertActive(jobId)
  await db.researchJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  })
}

export async function markFinished(jobId: string, status: "SUCCEEDED" | "PARTIAL", message: string) {
  const job = await db.researchJob.update({
    where: { id: jobId },
    data: { status, finishedAt: new Date(), stage: "done" },
  })
  await emit(jobId, job.projectId, "done", message, status === "SUCCEEDED" ? "SUCCESS" : "WARNING")
}

/** User-safe failure message: never leaks provider payloads or credentials. */
export function describeFailure(error: unknown) {
  if (error instanceof JobCancelledError) return "Research was cancelled."
  if (error instanceof ProviderUnavailableError) {
    return error.provider === "anthropic"
      ? "The AI research provider is not configured."
      : "Qloo is not configured. Switch to fixture mode or add credentials."
  }
  if (error instanceof ProviderResponseError) return error.message
  return "An unexpected error interrupted research. You can retry; completed stages are reused."
}

export async function markFailed(jobId: string, error: unknown) {
  const job = await db.researchJob.findUnique({ where: { id: jobId } })
  if (!job || job.status === "CANCELLED") return
  const message = describeFailure(error)
  await db.researchJob.update({
    where: { id: jobId },
    data: { status: "FAILED", error: message, finishedAt: new Date() },
  })
  await emit(jobId, job.projectId, "failed", message, "ERROR")
  console.error(`[job ${jobId}] failed`, error)
}
