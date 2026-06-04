"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { formatCurrency, formatDate, getWalletType } from "@/lib/utils"

interface Movement {
  id: string; date: string; description: string; category: string
  credit: number | null; debit: number | null; balance: number
}
interface WalletDetail {
  id: string; name: string; type: string; bank: string | null
  balance: number; color: string
}
interface WalletHistory {
  wallet: WalletDetail; movements: Movement[]
  totalIn: number; totalOut: number
}

const BalanceTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 14px" }}>
      <div className="text-xs font-semibold mb-1" style={{ color: "#94A3B8" }}>{label}</div>
      <div className="text-sm font-bold text-white">{formatCurrency(payload[0].value)}</div>
    </div>
  )
}

export default function WalletDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [data, setData] = useState<WalletHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all")

  useEffect(() => {
    if (!id) return
    fetch(`/api/wallets/${id}/history`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data?.wallet) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: "#64748B" }}>Cartera no encontrada.</p>
        <button onClick={() => router.push("/carteras")} className="btn-primary mt-4">Volver</button>
      </div>
    )
  }

  const { wallet, movements, totalIn, totalOut } = data
  const wt = getWalletType(wallet.type)

  const filtered = movements.filter((m) => {
    if (filter === "credit") return m.credit !== null
    if (filter === "debit") return m.debit !== null
    return true
  })

  // Chart data: balance over time (one point per movement)
  const chartData = movements.map((m) => ({
    label: new Date(m.date).toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
    balance: m.balance,
  }))

  const minBalance = Math.min(...movements.map((m) => m.balance), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <button onClick={() => router.push("/carteras")}
          className="mt-1 p-2 rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${wallet.color}20` }}>
              {wt.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{wallet.name}</h1>
              <div className="text-sm" style={{ color: "#64748B" }}>
                {wallet.bank && `${wallet.bank} · `}{wt.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card p-5 lg:col-span-2">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Saldo actual</div>
          <div className="text-3xl font-bold" style={{ color: wallet.color }}>{formatCurrency(wallet.balance)}</div>
          <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>{movements.length} movimientos registrados</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total entradas</div>
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIn)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total salidas</div>
          <div className="text-2xl font-bold text-red-400">{formatCurrency(totalOut)}</div>
        </div>
      </div>

      {/* Balance Chart */}
      {chartData.length > 1 && (
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">Evolución del saldo</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="walletBalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={wallet.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={wallet.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(chartData.length / 8))} />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<BalanceTooltip />} />
              {minBalance < 0 && <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 2" />}
              <Area type="monotone" dataKey="balance" name="Saldo"
                stroke={wallet.color} fill="url(#walletBalGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Movements Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">Estado de Cuenta</h2>
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-hover)" }}>
            {([
              { key: "all", label: "Todos" },
              { key: "credit", label: "Entradas" },
              { key: "debit", label: "Salidas" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filter === key ? (key === "credit" ? "rgba(16,185,129,0.2)" : key === "debit" ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)") : "transparent",
                  color: filter === key ? (key === "credit" ? "#34D399" : key === "debit" ? "#F87171" : "#818CF8") : "#64748B",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {movements.length === 0 ? (
          <div className="text-center py-12">
            <Wallet size={40} className="mx-auto mb-3" style={{ color: "#334155" }} />
            <p style={{ color: "#475569" }} className="text-sm">
              Sin movimientos aún. Registra ingresos o gastos vinculados a esta cartera.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Fecha", "Descripción", "Crédito (+)", "Débito (−)", "Saldo"].map((h) => (
                    <th key={h} className="text-left pb-3 pr-4 text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#64748B" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 pr-4 text-xs" style={{ color: "#94A3B8" }}>
                      {formatDate(m.date)}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="text-sm text-white font-medium leading-tight">{m.description}</div>
                      {m.category && m.category !== "Transferencia" && (
                        <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{m.category}</div>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {m.credit != null ? (
                        <span className="font-semibold text-emerald-400">
                          +{formatCurrency(m.credit)}
                        </span>
                      ) : (
                        <span style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {m.debit != null ? (
                        <span className="font-semibold text-red-400">
                          −{formatCurrency(m.debit)}
                        </span>
                      ) : (
                        <span style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`font-bold text-sm ${m.balance >= 0 ? "text-white" : "text-red-400"}`}>
                        {formatCurrency(m.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <td colSpan={2} className="pt-3 text-xs font-medium uppercase tracking-wider"
                    style={{ color: "#64748B" }}>Total</td>
                  <td className="pt-3 font-bold text-emerald-400">{formatCurrency(totalIn)}</td>
                  <td className="pt-3 font-bold text-red-400">−{formatCurrency(totalOut)}</td>
                  <td className="pt-3 font-bold text-white">{formatCurrency(wallet.balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
