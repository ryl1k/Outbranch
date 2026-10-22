"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "opportunities", label: "Opportunities" },
  { slug: "network", label: "Network" },
  { slug: "compare", label: "Compare" },
  { slug: "reports", label: "Reports" },
  { slug: "activity", label: "Research log" },
] as const

export function ProjectTabs({ projectId, hasResults }: { projectId: string; hasResults: boolean }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`
  return (
    <nav aria-label="Project sections" className="scrollbar-none -mb-px flex gap-1 overflow-x-auto">
      {TABS.map(({ slug, label }) => {
        const href = slug ? `${base}/${slug}` : base
        const active = slug ? pathname.startsWith(href) : pathname === base
        const disabled = !hasResults && slug !== "" && slug !== "activity"
        return disabled ? (
          <span
            key={label}
            aria-disabled
            title="Available once opportunities are discovered"
            className="cursor-not-allowed border-b-2 border-transparent px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground/50"
          >
            {label}
          </span>
        ) : (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
