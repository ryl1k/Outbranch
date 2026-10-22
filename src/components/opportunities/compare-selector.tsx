"use client"

import { useRouter } from "next/navigation"
import { ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function CompareSelector({
  projectId,
  all,
  selected,
}: {
  projectId: string
  all: { id: string; title: string; rank: number | null }[]
  selected: string[]
}) {
  const router = useRouter()
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...selected, id].slice(0, 4) : selected.filter((x) => x !== id)
    if (next.length >= 2) router.push(`/projects/${projectId}/compare?ids=${next.join(",")}`)
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <ListChecks /> Choose opportunities ({selected.length}/4)
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 py-1 text-xs text-muted-foreground">Compare 2 to 4 opportunities</p>
        <ul className="max-h-80 overflow-y-auto">
          {all.map((o) => {
            const checked = selected.includes(o.id)
            return (
              <li key={o.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox
                    checked={checked}
                    disabled={(!checked && selected.length >= 4) || (checked && selected.length <= 2)}
                    onCheckedChange={(v) => toggle(o.id, v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">#{o.rank} </span>
                    {o.title}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
