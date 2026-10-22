"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderKanban, Gauge, Menu, Plus } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/projects", label: "Projects", icon: FolderKanban, match: (p: string) => p === "/projects" || /^\/projects\/(?!new)/.test(p) },
  { href: "/projects/new", label: "New research", icon: Plus, match: (p: string) => p === "/projects/new" },
  { href: "/settings/usage", label: "Usage & providers", icon: Gauge, match: (p: string) => p.startsWith("/settings") },
]

type ViewerSummary = { name: string; isGuest: boolean; workspace: string }

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-0.5" aria-label="Workspace">
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function ViewerCard({ viewer }: { viewer: ViewerSummary }) {
  return (
    <div className="rounded-lg border bg-card/60 p-3 text-xs">
      <p className="font-medium text-foreground">{viewer.name}</p>
      <p className="truncate text-muted-foreground">{viewer.workspace}</p>
      {viewer.isGuest && (
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Guest workspace — kept in this browser for 30 days.
        </p>
      )}
    </div>
  )
}

export function Sidebar({ viewer, signOut }: { viewer: ViewerSummary; signOut: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
      <Link href="/projects" className="px-2">
        <Logo className="text-xl" />
      </Link>
      <div className="mt-8 flex-1">
        <NavLinks />
      </div>
      <div className="space-y-2">
        <ViewerCard viewer={viewer} />
        {signOut}
      </div>
    </aside>
  )
}

export function MobileNav({ viewer, signOut }: { viewer: ViewerSummary; signOut: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
      <Link href="/projects">
        <Logo className="text-lg" />
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar p-5">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo className="text-xl" />
          <div className="mt-8 flex h-full flex-col gap-6">
            <NavLinks />
            <div className="mt-auto space-y-2 pb-6">
              <ViewerCard viewer={viewer} />
              {signOut}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
