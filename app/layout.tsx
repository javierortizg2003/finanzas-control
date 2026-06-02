import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "FinanzasControl – Tu Libertad Financiera",
  description:
    "Controla tus ingresos, gastos y ahorros. Planifica tu camino hacia la libertad financiera.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full" style={{ background: "#060D1F" }}>
        <Navigation />
        {/* Offset content for sidebar on desktop, bottom nav on mobile */}
        <main className="md:ml-60 pb-20 md:pb-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
