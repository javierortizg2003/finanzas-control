"use client"

import { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Calculator, TrendingUp } from "lucide-react"
import { formatCurrency, calculateCompoundInterest } from "@/lib/utils"

export default function CalculadoraPage() {
  const [form, setForm] = useState({
    initialAmount: "0",
    monthlyAmount: "2000",
    annualRate: "7",
    years: "10",
  })

  const initial = parseFloat(form.initialAmount) || 0
  const monthly = parseFloat(form.monthlyAmount) || 0
  const rate = parseFloat(form.annualRate) || 0
  const years = Math.min(50, Math.max(1, parseInt(form.years) || 10))

  const projectionData = useMemo(
    () => calculateCompoundInterest(initial, monthly, rate, years),
    [initial, monthly, rate, years]
  )

  const finalBalance = projectionData[projectionData.length - 1]?.balance || 0
  const totalContributed = projectionData[projectionData.length - 1]?.contributed || 0
  const totalInterest = projectionData[projectionData.length - 1]?.interest || 0

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; color: string; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: "#0D1B33", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 14px" }}>
        <div className="text-xs font-semibold text-white mb-2">Año {label}</div>
        {payload.map((p, i) => (
          <div key={i} className="text-xs flex gap-2 mb-1">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="text-white">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Calculator style={{ color: "#22C55E" }} /> Calculadora de Ahorro
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">Proyecta tu crecimiento con interés compuesto</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Parámetros</h2>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Ahorro inicial
              </label>
              <input type="number" step="100" min="0" className="input-dark"
                placeholder="$0.00"
                value={form.initialAmount}
                onChange={(e) => setForm({ ...form, initialAmount: e.target.value })} />
              <div className="text-xs mt-1" style={{ color: "#64748B" }}>¿Cuánto tienes ahorrado hoy?</div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Ahorro mensual
              </label>
              <input type="number" step="100" min="0" className="input-dark"
                placeholder="$0.00"
                value={form.monthlyAmount}
                onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} />
              <div className="text-xs mt-1" style={{ color: "#64748B" }}>¿Cuánto ahorrarás cada mes?</div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Tasa de interés anual: <span style={{ color: "#22C55E" }}>{rate}%</span>
              </label>
              <input type="range" min="0" max="20" step="0.5" className="w-full accent-emerald-500"
                value={form.annualRate}
                onChange={(e) => setForm({ ...form, annualRate: e.target.value })} />
              <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                <span>0% (sin interés)</span>
                <span>20% (alta rentabilidad)</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                CETES: ~10% · ETFs globales: ~7% · Crypto: variable
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Plazo: <span style={{ color: "#22C55E" }}>{years} años</span>
              </label>
              <input type="range" min="1" max="40" step="1" className="w-full accent-emerald-500"
                value={form.years}
                onChange={(e) => setForm({ ...form, years: e.target.value })} />
              <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                <span>1 año</span>
                <span>40 años</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card p-5">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Saldo final</div>
              <div className="text-xl font-bold text-emerald-400">{formatCurrency(finalBalance)}</div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>En {years} años</div>
            </div>
            <div className="stat-card p-5">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Aportado</div>
              <div className="text-xl font-bold text-white">{formatCurrency(totalContributed)}</div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Capital propio</div>
            </div>
            <div className="stat-card p-5">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Intereses</div>
              <div className="text-xl font-bold text-indigo-400">{formatCurrency(totalInterest)}</div>
              <div className="text-xs mt-1" style={{ color: "#10B981" }}>
                {totalContributed > 0 ? `${((totalInterest / totalContributed) * 100).toFixed(0)}% extra ganado` : ""}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Proyección de crecimiento</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projectionData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="contributedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false}
                  label={{ value: "Años", position: "insideBottom", fill: "#64748B", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="contributed" name="Capital aportado"
                  stroke="#6366F1" fill="url(#contributedGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="balance" name="Saldo total"
                  stroke="#10B981" fill="url(#balanceGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
                <div className="w-3 h-1.5 rounded" style={{ background: "#10B981" }} /> Saldo total
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
                <div className="w-3 h-1.5 rounded" style={{ background: "#6366F1" }} /> Capital aportado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Table */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Tabla de proyección anual</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
                {["Año", "Saldo Total", "Capital Aportado", "Intereses Ganados", "Rentabilidad"].map((h) => (
                  <th key={h} className="text-left pb-3 pr-4 text-xs font-medium uppercase tracking-wider"
                    style={{ color: "#64748B" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectionData.map((row) => (
                <tr key={row.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-white">Año {row.year}</td>
                  <td className="py-2.5 pr-4 text-emerald-400 font-semibold">{formatCurrency(row.balance)}</td>
                  <td className="py-2.5 pr-4" style={{ color: "#94A3B8" }}>{formatCurrency(row.contributed)}</td>
                  <td className="py-2.5 pr-4 text-indigo-400">{formatCurrency(row.interest)}</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-emerald-400">
                      {row.contributed > 0 ? `+${((row.interest / row.contributed) * 100).toFixed(1)}%` : "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta de ahorro mensual */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} style={{ color: "#22C55E" }} />
          <h2 className="text-lg font-semibold text-white">¿Cuánto necesito ahorrar para mi meta?</h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[500000, 1000000, 2000000].map((goal) => {
            const monthlyNeeded = rate > 0
              ? (goal - initial * Math.pow(1 + rate / 100 / 12, years * 12)) /
                ((Math.pow(1 + rate / 100 / 12, years * 12) - 1) / (rate / 100 / 12))
              : (goal - initial) / (years * 12)
            return (
              <div key={goal} className="p-5 rounded-xl text-center"
                style={{ background: "rgba(6,13,31,0.5)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="text-sm font-medium mb-2" style={{ color: "#94A3B8" }}>Meta</div>
                <div className="text-2xl font-bold text-white mb-2">{formatCurrency(goal)}</div>
                <div className="text-sm" style={{ color: "#64748B" }}>en {years} años necesitas ahorrar:</div>
                <div className="text-xl font-bold text-emerald-400 mt-2">
                  {monthlyNeeded > 0 ? formatCurrency(Math.ceil(monthlyNeeded)) : "Ya alcanzado"}/mes
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
