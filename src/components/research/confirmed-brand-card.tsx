"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Link2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { reopenProfile } from "@/server/projects/actions"
import type { BrandVerification } from "@/server/projects/queries"

export function ConfirmedBrandCard({ projectId, data }: { projectId: string; data: BrandVerification }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const refs = data.culturalRefs.filter((r) => !r.removed)
  const resolved = refs.filter((r) => r.qlooId).length
  const tags = data.themes.filter((t) => t.tag).length

  return (
    <aside className="h-fit space-y-5 rounded-xl border bg-card p-5 shadow-soft lg:sticky lg:top-6">
      <div className="flex items-center gap-2 text-sm font-medium text-success">
        <BadgeCheck className="size-4" /> Profile confirmed
      </div>
      <div>
        <h2 className="text-lg font-semibold">{data.profile.name}</h2>
        <p className="mt-1 line-clamp-5 text-sm text-muted-foreground">{data.profile.summary}</p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Qloo entity", data.profile.qlooEntity ? "Yes" : "No"],
          ["References", `${resolved}/${refs.length}`],
          ["Tags", `${tags}/${data.themes.length}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted/60 px-2 py-2.5">
            <dd className="font-mono text-sm font-medium">{v}</dd>
            <dt className="mt-0.5 text-[11px] text-muted-foreground">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Cultural signals in use</p>
        <ul className="flex flex-wrap gap-1.5">
          {data.profile.qlooEntity && (
            <li>
              <Badge variant="accent">
                <Link2 /> {data.profile.qlooEntity.name}
              </Badge>
            </li>
          )}
          {refs
            .filter((r) => r.qlooId)
            .map((r) => (
              <li key={r.name}>
                <Badge variant="sage">{r.resolvedName ?? r.name}</Badge>
              </li>
            ))}
        </ul>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await reopenProfile(projectId)
            router.refresh()
          })
        }
      >
        <Pencil /> Edit profile
      </Button>
    </aside>
  )
}
