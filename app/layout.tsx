import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { PrivacyProvider } from "@/components/providers/PrivacyProvider"
import { PreferencesProvider } from "@/components/providers/PreferencesProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "FinanzasControl – Tu Libertad Financiera",
  description: "Controla tus ingresos, gastos y ahorros. Planifica tu camino hacia la libertad financiera.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${geistSans.variable} h-full`}>
        <body className="min-h-full">
          <PrivacyProvider>
            <PreferencesProvider>
              {children}
            </PreferencesProvider>
          </PrivacyProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
