import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Inter, Manrope, Newsreader } from "next/font/google"
import { InlineScript } from "@/components/inline-script"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { THEME_BOOT_SCRIPT } from "@/lib/theme"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] })
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
})
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: { default: "Outbranch — See further. Grow smarter.", template: "%s · Outbranch" },
  description:
    "Outbranch turns cultural intelligence into real growth opportunities for your brand, company or IP.",
  applicationName: "Outbranch",
}

export const viewport: Viewport = {
  themeColor: "#1A0E14",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} ${newsreader.variable} ${plexMono.variable} h-full`}
    >
      <head>
        <InlineScript html={THEME_BOOT_SCRIPT} />
      </head>
      <body className="min-h-full">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
