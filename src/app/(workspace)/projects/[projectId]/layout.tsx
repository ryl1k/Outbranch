import { notFound } from "next/navigation"
import { LogoMark } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { DataModeBadge, StageBadge } from "@/components/workspace/primitives"
import { ProjectTabs } from "@/components/workspace/project-tabs"
import { ENTITY_KIND_LABELS, entityKindSchema } from "@/lib/schemas/brand"
import { AuthError } from "@/server/auth/session"
import { getProjectHeader } from "@/server/projects/queries"

async function loadHeader(projectId: string) {
  try {
    return await getProjectHeader(projectId)
  } catch (error) {
    if (error instanceof AuthError) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params
  const header = await getProjectHeader(projectId).catch(() => null)
  return { title: header?.profile?.name ?? header?.project.name ?? "Project" }
}

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params
  const { project, profile } = await loadHeader(projectId)
  const kind = entityKindSchema.safeParse(profile?.entityKind)
  const hasResults = project.stage === "READY" || project.stage === "DISCOVERING"

  return (
    <div>
      <header className="border-b bg-card/50 print:hidden">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-aubergine">
                {profile?.qlooEntity?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote entity artwork from Qloo
                  <img src={profile.qlooEntity.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <LogoMark tone="light" className="size-7" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold">{profile?.name ?? project.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {kind.success && <span>{ENTITY_KIND_LABELS[kind.data]}</span>}
                  {profile?.industry && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{profile.industry}</span>
                    </>
                  )}
                  {profile?.status === "CONFIRMED" && (
                    <Badge variant="sage" className="ml-1">
                      Profile confirmed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StageBadge stage={project.stage} />
              <DataModeBadge mode={project.dataMode} />
            </div>
          </div>
          <div className="mt-5">
            <ProjectTabs projectId={project.id} hasResults={hasResults} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 print:max-w-none print:p-0">{children}</div>
    </div>
  )
}
