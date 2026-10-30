"use client"

import { useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { deleteProject } from "@/server/projects/actions"

export function DeleteProjectButton({
  projectId,
  name,
  className,
  redirectTo,
}: {
  projectId: string
  name: string
  className?: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${name}`}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              “{name}” and all of its research, opportunities and reports will be permanently deleted. Any research
              still running is cancelled. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteProject(projectId)
                  if (!res.ok) {
                    toast.error(res.error)
                    return
                  }
                  setOpen(false)
                  if (redirectTo) router.push(redirectTo)
                  else router.refresh()
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
