"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import {
  LayoutDashboard, TrendingUp, TrendingDown, PiggyBank,
  BarChart3, Calculator, Target, DollarSign, Wallet, CreditCard,
  Settings, Eye, EyeOff, Landmark, ChevronDown, Menu,
} from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import { usePrivacy } from "@/components/providers/PrivacyProvider"
import { useState } from "react"

const NAV_ITEMS = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"    },
  { href: "/carteras",     icon: Wallet,          label: "Carteras"     },
  { href: "/ingresos",     icon: TrendingUp,      label: "Ingresos"     },
  { href: "/gastos",       icon: TrendingDown,    label: "Gastos"       },
  { href: "/ahorros",      icon: PiggyBank,       label: "Inversión"    },
  { href: "/deudas",       icon: CreditCard,      label: "Deudas"       },
  { href: "/presupuesto",  icon: BarChart3,       label: "Presupuesto"  },
  { href: "/calculadora",  icon: Calculator,      label: "Calculadora"  },
  { href: "/metas",        icon: Target,          label: "Metas"        },
  { href: "/activos",      icon: Landmark,        label: "Activos"      },
  { href: "/configuracion",icon: Settings,        label: "Config"       },
]

// First 4 stay pinned in the bottom bar
const PINNED = NAV_ITEMS.slice(0, 4)

function isActive(href: string, pathname: string) {
  if (href === "/carteras") return pathname.startsWith("/carteras")
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href
}

export default function Navigation() {
  const pathname = usePathname()
  const { isPrivate, togglePrivacy } = usePrivacy()
  const [menuOpen, setMenuOpen] = useState(false)

  const close = () => setMenuOpen(false)

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 z-50"
        style={{ background: "rgba(6,13,31,0.97)", borderRight: "1px solid rgba(16,185,129,0.1)" }}>

        <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#059669,#10B981)" }}>
            <DollarSign size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">FinanzasControl</div>
            <div className="text-xs" style={{ color: "#10B981" }}>Tu libertad financiera</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href, pathname)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
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
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <button onClick={togglePrivacy}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: isPrivate ? "rgba(16,185,129,0.15)" : "transparent",
                  border: isPrivate ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                {isPrivate ? <EyeOff size={16} style={{ color: "#10B981" }} /> : <Eye size={16} style={{ color: "#64748B" }} />}
              </button>
              <UserButton />
            </div>
          </div>
          <div className="text-xs text-center" style={{ color: "#475569" }}>Tu camino a la libertad</div>
        </div>
      </aside>

      {/* ─── Mobile top bar ─── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: 52,
          background: "rgba(6,13,31,0.98)",
          borderBottom: "1px solid rgba(16,185,129,0.12)",
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#059669,#10B981)" }}>
            <DollarSign size={13} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white">FinanzasControl</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={togglePrivacy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: isPrivate ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${isPrivate ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: isPrivate ? "#10B981" : "#94A3B8",
            }}>
            {isPrivate ? <EyeOff size={12} /> : <Eye size={12} />}
            {isPrivate ? "Oculto" : "Visible"}
          </button>
          <UserButton />
        </div>
      </div>

      {/* ─── Mobile bottom bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "rgba(6,13,31,0.98)",
          borderTop: "1px solid rgba(16,185,129,0.15)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
        {PINNED.map(({ href, icon: Icon, label }) => {
          const active = isActive(href, pathname)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
              style={{ color: active ? "#10B981" : "#64748B" }}>
              <Icon size={21} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
            </Link>
          )
        })}

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all"
          style={{ color: menuOpen ? "#10B981" : "#64748B" }}>
          {menuOpen
            ? <ChevronDown size={21} />
            : <Menu size={21} />}
          <span style={{ fontSize: 10, fontWeight: 500 }}>Menú</span>
        </button>
      </nav>

      {/* ─── Full-screen menu overlay ─── */}
      <div
        className="md:hidden fixed inset-0 z-40 flex flex-col"
        style={{
          background: "rgba(6,13,31,0.99)",
          transform: menuOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
          // sit above page but below top bar (52px) and bottom nav (~64px)
          top: 52,
          bottom: 64,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>

        {/* Pull-down handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* All nav items — 2 column grid */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-3">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = isActive(href, pathname)
              return (
                <Link key={href} href={href} onClick={close}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                  style={{
                    background: active ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                    color: active ? "#10B981" : "#94A3B8",
                  }}>
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom strip inside overlay */}
        <div className="px-4 py-4 border-t flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <ThemeToggle />
          <button
            onClick={() => { togglePrivacy(); close() }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: isPrivate ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${isPrivate ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)"}`,
              color: isPrivate ? "#10B981" : "#94A3B8",
            }}>
            {isPrivate ? <EyeOff size={15} /> : <Eye size={15} />}
            {isPrivate ? "Mostrar números" : "Ocultar números"}
          </button>
        </div>
      </div>
    </>
  )
}
