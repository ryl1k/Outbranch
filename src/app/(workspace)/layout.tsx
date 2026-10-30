import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNav, Sidebar } from "@/components/workspace/sidebar"
import { THEME_BOOT_SCRIPT, WorkspaceTheme } from "@/components/workspace/theme"
import { signOut } from "@/server/auth/config"
import { requireViewer } from "@/server/auth/session"

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer()
  const summary = {
    name: viewer.user.name ?? viewer.user.email ?? "Researcher",
    isGuest: viewer.user.isGuest,
    workspace: viewer.workspace.name,
  }
  const signOutButton = (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/" })
      }}
    >
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
        <LogOut /> Sign out
      </Button>
    </form>
  )

  return (
    <div className="flex min-h-dvh">
      {/* Applies the saved theme before first paint so the page does not flash light. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      <WorkspaceTheme />
      <Sidebar viewer={summary} signOut={signOutButton} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav viewer={summary} signOut={signOutButton} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
