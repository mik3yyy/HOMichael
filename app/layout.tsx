import type { Metadata } from "next"
import "./globals.css"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import SessionProvider from "./SessionProvider"

export const metadata: Metadata = {
  title: "House of Michaels",
  description: "The private house for Michaels. One name. One community. Lifetime access.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png",   sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/icon.png",
  },
  openGraph: {
    title: "House of Michaels",
    description: "The private house for Michaels. One name. One community. Lifetime access.",
    images: [{ url: "/icon.png", width: 1024, height: 1024 }],
    siteName: "House of Michaels",
  },
  twitter: {
    card: "summary",
    title: "House of Michaels",
    description: "The private house for Michaels.",
    images: ["/icon.png"],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
