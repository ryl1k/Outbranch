"use client"

import { BranchLines } from "@/components/brand/branch-lines"
import { cn } from "@/lib/utils"
import { useInView } from "./motion"

/** Branch lines that draw themselves the first time they scroll into view. */
export function InViewBranches({ className }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 })
  return (
    <div ref={ref} className={cn("pointer-events-none", className)} aria-hidden>
      {inView && <BranchLines className="h-full w-full" showOrigin={false} />}
    </div>
  )
}
