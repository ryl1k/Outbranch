"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { retryBrandResearch } from "@/server/projects/actions"

export function RetryButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await retryBrandResearch(projectId)
          if (!res.ok) toast.error(res.error)
          else router.refresh()
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Retry research
    </Button>
  )
}
