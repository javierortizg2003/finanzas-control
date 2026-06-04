"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { DollarSign, TrendingUp, PieChart, Target } from "lucide-react"

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060D1F" }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: "#10B981" }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#060D1F" }}>
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}>
              <DollarSign size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">FinanzasControl</h1>
          <p className="text-lg" style={{ color: "#10B981" }}>Tu camino hacia la libertad financiera</p>
        </div>

        {/* Descripción */}
        <p className="text-base" style={{ color: "#94A3B8" }}>
          Controla tus ingresos, gastos, ahorros y metas en un solo lugar.
          Toma decisiones financieras más inteligentes.
        </p>

        {/* Características */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: TrendingUp, label: "Ingresos" },
            { icon: PieChart, label: "Gastos" },
            { icon: DollarSign, label: "Ahorros" },
            { icon: Target, label: "Metas" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="p-4 rounded-lg"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Icon size={24} className="mx-auto mb-2" style={{ color: "#10B981" }} />
              <p className="text-sm font-medium text-white">{label}</p>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div className="flex flex-col gap-3 pt-2">
          <Link href="/sign-up"
            className="w-full py-3 px-4 rounded-lg font-semibold text-center transition-all"
            style={{ background: "linear-gradient(135deg, #059669, #10B981)", color: "white" }}>
            Crear Cuenta
          </Link>
          <Link href="/sign-in"
            className="w-full py-3 px-4 rounded-lg font-semibold text-center transition-all"
            style={{ color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
            Iniciar Sesión
          </Link>
        </div>

        <p className="text-xs" style={{ color: "#475569" }}>
          Al registrarte, aceptas nuestros términos de servicio
        </p>
      </div>
    </div>
  )
}
