"use client"

import { useEffect, useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DARK_CLASS, STORAGE_KEY } from "@/lib/theme"

function savedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Dark mode only applies inside the workspace: marketing and auth pages stay as designed. */
export function WorkspaceTheme() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle(DARK_CLASS, savedTheme() === "dark")
    return () => root.classList.remove(DARK_CLASS)
  }, [])
  return null
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains(DARK_CLASS),
    () => false,
  )

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        const next = !dark
        document.documentElement.classList.toggle(DARK_CLASS, next)
        try {
          localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
        } catch {
          // Private mode or blocked storage: the choice just lasts for this page view.
        }
      }}
    >
      {dark ? <Sun /> : <Moon />} {dark ? "Light mode" : "Dark mode"}
    </Button>
  )
}
