import Link from "next/link"
import { ArrowRight, FolderSearch, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataModeBadge, EmptyState, PageHeader, StageBadge } from "@/components/workspace/primitives"
import { ENTITY_KIND_LABELS, entityKindSchema } from "@/lib/schemas/brand"
import { requireViewer } from "@/server/auth/session"
import { listProjects } from "@/server/projects/queries"

export const metadata = { title: "Projects" }

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })

export default async function ProjectsPage() {
  const viewer = await requireViewer()
  const projects = await listProjects(viewer)

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader
        eyebrow="Workspace"
        title="Research projects"
        description="Each project researches one brand, company or IP and keeps its evidence, opportunities and reports."
        actions={
          <Button asChild size="lg">
            <Link href="/projects/new">
              <Plus /> New research
            </Link>
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title="No research yet"
          description="Start with a brand, company, product, entertainment IP or website. Outbranch handles the rest."
          action={
            <Button asChild>
              <Link href="/projects/new">
                Explore opportunities <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const kind = entityKindSchema.safeParse(p.profile?.entityKind)
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="group flex h-full flex-col rounded-xl border bg-card p-5 shadow-soft transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold group-hover:text-primary">
                        {p.profile?.name ?? p.name}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[kind.success ? ENTITY_KIND_LABELS[kind.data] : null, p.profile?.industry]
                          .filter(Boolean)
                          .join(" · ") || p.identifier}
                      </p>
                    </div>
                    <StageBadge stage={p.stage} />
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-6 text-xs text-muted-foreground">
                    <span>
                      {p._count.opportunities > 0
                        ? `${p._count.opportunities} opportunities`
                        : `Updated ${dateFmt.format(p.updatedAt)}`}
                    </span>
                    <DataModeBadge mode={p.dataMode} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
