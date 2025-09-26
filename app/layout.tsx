import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { CompanyProvider } from "@/lib/company-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "krkn",
  description: "Powered by Black Sheep",
  generator: "Black Sheep",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <CompanyProvider>
          {children}
          <Analytics />
        </CompanyProvider>
      </body>
    </html>
  )
}
