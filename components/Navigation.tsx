"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, TrendingUp, TrendingDown, PiggyBank,
  BarChart3, Calculator, Target, DollarSign, Wallet, CreditCard, Settings,
} from "lucide-react"
import ThemeToggle from "./ThemeToggle"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/carteras", icon: Wallet, label: "Carteras" },
  { href: "/ingresos", icon: TrendingUp, label: "Ingresos" },
  { href: "/gastos", icon: TrendingDown, label: "Gastos" },
  { href: "/ahorros", icon: PiggyBank, label: "Inversión" },
  { href: "/deudas", icon: CreditCard, label: "Deudas" },
  { href: "/presupuesto", icon: BarChart3, label: "Presupuesto" },
  { href: "/calculadora", icon: Calculator, label: "Calculadora" },
  { href: "/metas", icon: Target, label: "Metas" },
  { href: "/configuracion", icon: Settings, label: "Configuración" },
]

export default function Navigation() {
  const pathname = usePathname()
  const isCarteras = pathname.startsWith("/carteras")

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 z-50"
        style={{ background: "rgba(6,13,31,0.97)", borderRight: "1px solid rgba(16,185,129,0.1)" }}>

        {/* Logo + Theme toggle */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}>
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">FinanzasControl</div>
              <div className="text-xs" style={{ color: "#10B981" }}>Tu libertad financiera</div>
            </div>
          </div>
          <ThemeToggle compact />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = href === "/carteras" ? isCarteras : pathname === href
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? "rgba(16,185,129,0.15)" : "transparent",
                  color: active ? "#10B981" : "#94A3B8",
                  border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
                }}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t space-y-3" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
          <ThemeToggle />
          <div className="text-xs text-center" style={{ color: "#475569" }}>Tu camino a la libertad 🚀</div>
        </div>
      </aside>

      {/* Mobile: top-right theme toggle + bottom nav */}
      <div className="md:hidden fixed top-3 right-3 z-50">
        <ThemeToggle compact />
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center py-3 px-2"
        style={{ background: "rgba(6,13,31,0.97)", borderTop: "1px solid rgba(16,185,129,0.15)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === "/carteras" ? isCarteras : pathname === href
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-1 py-1">
              <Icon size={20} style={{ color: active ? "#10B981" : "#475569" }} />
              <span style={{ color: active ? "#10B981" : "#475569", fontSize: "9px" }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
