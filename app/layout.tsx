// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { CompanyProvider } from "@/lib/company-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "krkn",
  description: "Powered by Black Sheep",
  generator: "Black Sheep",
  applicationName: "KRKN",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <CompanyProvider>
          {children}
          <Analytics />
        </CompanyProvider>
      </body>
    </html>
  );
}
