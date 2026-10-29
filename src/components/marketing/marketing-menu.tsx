"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

/** Phone and tablet navigation for the landing page: the section links and account action in a sheet. */
export function MarketingMenu({ links, account }: { links: readonly (readonly [string, string])[]; account: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="text-ivory hover:bg-ivory/10 hover:text-ivory md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="theme-dark w-72 border-ivory/10 bg-background p-6 text-foreground">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Logo tone="light" className="text-xl" />
        <nav aria-label="Sections" className="mt-10 flex flex-col gap-1">
          {links.map(([href, label]) => (
            <SheetClose asChild key={href}>
              <a href={href} className="rounded-lg px-3 py-3 text-base text-ivory/80 hover:bg-ivory/5 hover:text-ivory">
                {label}
              </a>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-8 space-y-3 border-t border-ivory/10 pt-6">
          {account}
          <Button asChild className="h-11 w-full rounded-full">
            <Link href="/projects/new">Explore opportunities</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
