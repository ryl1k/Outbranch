"use client"

import { useEffect, useRef, useState } from "react"
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
  const navRef = useRef<HTMLElement>(null)
  // Which edges have more tabs beyond them; phones only fit three or four.
  const [more, setMore] = useState({ left: false, right: false })

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const update = () =>
      setMore({ left: nav.scrollLeft > 4, right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4 })
    // Bring the current tab into view without moving the page vertically.
    const current = nav.querySelector<HTMLElement>("[aria-current=page]")
    if (current) {
      const left = current.offsetLeft - nav.clientWidth / 2 + current.offsetWidth / 2
      nav.scrollTo({ left: Math.max(0, left) })
    }
    update()
    nav.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      nav.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [pathname])

  const fade = more.left && more.right
    ? "[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    : more.right
      ? "[mask-image:linear-gradient(to_right,black_85%,transparent)]"
      : more.left
        ? "[mask-image:linear-gradient(to_right,transparent,black_15%)]"
        : undefined

  return (
    <nav ref={navRef} aria-label="Project sections" className={cn("scrollbar-none relative -mb-px flex gap-1 overflow-x-auto", fade)}>
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
                ? "border-primary-ink font-medium text-primary-ink"
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
