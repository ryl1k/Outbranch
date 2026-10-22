"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { culturalRefListSchema } from "@/lib/schemas/brand"
import { createProjectSchema, projectNameFrom, type CreateProjectInput } from "@/lib/schemas/project"
import { assertProjectAccess, assertViewer } from "@/server/auth/session"
import { db } from "@/server/db"
import { enqueueJob, requestCancel } from "@/server/jobs/lifecycle"
import { qlooMode } from "@/server/providers/qloo/client"
import { assertJobBudget, assertProjectBudget } from "@/server/security/rate-limit"
import { runAction } from "./action-result"

const id = z.string().min(1).max(64)

export async function createProject(input: CreateProjectInput) {
  let projectId = ""
  const result = await runAction(async () => {
    const viewer = await assertViewer()
    const { identifier, context } = createProjectSchema.parse(input)
    await assertProjectBudget(viewer.workspace.id)
    await assertJobBudget(viewer.workspace.id)
    const project = await db.project.create({
      data: {
        workspaceId: viewer.workspace.id,
        createdById: viewer.user.id,
        name: projectNameFrom(identifier),
        identifier,
        userContext: context,
        dataMode: qlooMode(),
      },
    })
    await enqueueJob({ projectId: project.id, workspaceId: viewer.workspace.id, kind: "RESOLVE_ENTITY" })
    projectId = project.id
  })
  if (result.ok) redirect(`/projects/${projectId}`)
  return result
}

export async function selectCandidate(projectId: string, candidateId: string) {
  return runAction(async () => {
    const { viewer, project } = await assertProjectAccess(id.parse(projectId))
    await assertJobBudget(viewer.workspace.id)
    const candidate = await db.brandCandidate.findFirst({ where: { id: id.parse(candidateId), projectId } })
    if (!candidate) throw new z.ZodError([{ code: "custom", message: "Unknown candidate", path: [] }])
    await db.$transaction([
      db.brandCandidate.updateMany({ where: { projectId }, data: { selected: false } }),
      db.brandCandidate.update({ where: { id: candidate.id }, data: { selected: true } }),
      db.project.update({ where: { id: project.id }, data: { stage: "RESEARCHING_BRAND", name: candidate.name } }),
    ])
    await enqueueJob({ projectId, workspaceId: viewer.workspace.id, kind: "BRAND_RESEARCH" })
    revalidatePath(`/projects/${projectId}`)
  })
}

/** Restart identification, optionally with a corrected identifier. */
export async function restartResolution(projectId: string, identifier?: string) {
  return runAction(async () => {
    const { viewer } = await assertProjectAccess(id.parse(projectId))
    await assertJobBudget(viewer.workspace.id)
    const next = identifier ? createProjectSchema.shape.identifier.parse(identifier) : undefined
    await db.project.update({
      where: { id: projectId },
      data: { stage: "RESOLVING", ...(next ? { identifier: next, name: projectNameFrom(next) } : {}) },
    })
    await enqueueJob({ projectId, workspaceId: viewer.workspace.id, kind: "RESOLVE_ENTITY" })
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function retryBrandResearch(projectId: string) {
  return runAction(async () => {
    const { viewer } = await assertProjectAccess(id.parse(projectId))
    await assertJobBudget(viewer.workspace.id)
    const selected = await db.brandCandidate.count({ where: { projectId, selected: true } })
    await enqueueJob({
      projectId,
      workspaceId: viewer.workspace.id,
      kind: selected ? "BRAND_RESEARCH" : "RESOLVE_ENTITY",
    })
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function cancelJob(projectId: string, jobId: string) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    const job = await db.researchJob.findFirst({ where: { id: id.parse(jobId), projectId } })
    if (job && (job.status === "QUEUED" || job.status === "RUNNING")) await requestCancel(job.id)
    revalidatePath(`/projects/${projectId}`)
  })
}

// ---------------------------------------------------------------------------
// Brand verification
// ---------------------------------------------------------------------------

const profileEditSchema = z.object({
  summary: z.string().trim().min(10).max(1200).optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  positioning: z.string().trim().max(800).nullable().optional(),
})

export async function updateProfile(projectId: string, patch: z.input<typeof profileEditSchema>) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    const data = profileEditSchema.parse(patch)
    await db.brandProfile.update({
      where: { projectId },
      data: { ...data, status: "DRAFT", confirmedAt: null },
    })
    for (const [field, value] of Object.entries(data)) {
      if (value) {
        await db.claim.create({
          data: { projectId, topic: `user:${field}`, statement: value, status: "USER_PROVIDED" },
        })
      }
    }
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function setClaimRejected(projectId: string, claimId: string, rejected: boolean) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    const claim = await db.claim.findFirst({ where: { id: id.parse(claimId), projectId } })
    if (!claim) return
    // Restoring returns a claim to INFERRED: we no longer assert the original verification.
    const status = rejected ? "REJECTED" : claim.sourceId ? "VERIFIED" : "INFERRED"
    await db.claim.update({ where: { id: claim.id }, data: { status } })
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function setCulturalRefRemoved(projectId: string, refName: string, removed: boolean) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    const profile = await db.brandProfile.findUniqueOrThrow({ where: { projectId } })
    const refs = culturalRefListSchema.parse(profile.culturalRefs).map((r) => (r.name === refName ? { ...r, removed } : r))
    await db.brandProfile.update({ where: { projectId }, data: { culturalRefs: refs } })
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function addUserContext(projectId: string, statement: string) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    const text = z.string().trim().min(3).max(600).parse(statement)
    await db.claim.create({ data: { projectId, topic: "user:context", statement: text, status: "USER_PROVIDED" } })
    revalidatePath(`/projects/${projectId}`)
  })
}

/** Explicit gate: discovery can never start from an unconfirmed profile. */
export async function confirmProfile(projectId: string) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    await db.$transaction([
      db.brandProfile.update({ where: { projectId }, data: { status: "CONFIRMED", confirmedAt: new Date() } }),
      db.project.update({ where: { id: projectId }, data: { stage: "CONFIGURING" } }),
    ])
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function reopenProfile(projectId: string) {
  return runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    await db.$transaction([
      db.brandProfile.update({ where: { projectId }, data: { status: "DRAFT", confirmedAt: null } }),
      db.project.update({ where: { id: projectId }, data: { stage: "NEEDS_CONFIRMATION" } }),
    ])
    revalidatePath(`/projects/${projectId}`)
  })
}

export async function archiveProject(projectId: string) {
  const result = await runAction(async () => {
    await assertProjectAccess(id.parse(projectId))
    await db.project.update({ where: { id: projectId }, data: { archivedAt: new Date() } })
  })
  if (result.ok) redirect("/projects")
  return result
}
