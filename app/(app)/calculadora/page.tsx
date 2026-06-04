"use client"

import { useState, useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts"
import { Calculator, TrendingUp, CreditCard } from "lucide-react"
import { formatCurrency, formatPercent, calculateCompoundInterest } from "@/lib/utils"
import AmortizationTable from "@/components/AmortizationTable"

type Tab = "ahorro" | "prestamo"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcMonthlyPayment(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return principal / months
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// ─── Tooltips ────────────────────────────────────────────────────────────────
function SavingsTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; color: string; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 14px" }}>
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

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CalculadoraPage() {
  const [tab, setTab] = useState<Tab>("ahorro")

  // ── Ahorro state ──
  const [savForm, setSavForm] = useState({ initialAmount: "0", monthlyAmount: "2000", annualRate: "7", years: "10" })

  // ── Préstamo state ──
  const [loanForm, setLoanForm] = useState({ amount: "50000", rate: "24", months: "24", extra: "0" })
  const [showAmortTable, setShowAmortTable] = useState(false)

  // ── Ahorro calcs ──
  const sav = {
    initial: parseFloat(savForm.initialAmount) || 0,
    monthly: parseFloat(savForm.monthlyAmount) || 0,
    rate: parseFloat(savForm.annualRate) || 0,
    years: Math.min(50, Math.max(1, parseInt(savForm.years) || 10)),
  }
  const projectionData = useMemo(
    () => calculateCompoundInterest(sav.initial, sav.monthly, sav.rate, sav.years),
    [sav.initial, sav.monthly, sav.rate, sav.years]
  )
  const finalBalance    = projectionData.at(-1)?.balance     ?? 0
  const totalContributed = projectionData.at(-1)?.contributed ?? 0
  const totalSavInterest = projectionData.at(-1)?.interest    ?? 0

  // ── Préstamo calcs ──
  const loan = {
    amount: parseFloat(loanForm.amount) || 0,
    rate:   parseFloat(loanForm.rate)   || 0,
    months: parseInt(loanForm.months)   || 1,
    extra:  parseFloat(loanForm.extra)  || 0,
  }
  const monthlyPayment = useMemo(
    () => calcMonthlyPayment(loan.amount, loan.rate, loan.months),
    [loan.amount, loan.rate, loan.months]
  )
  const totalPaid     = monthlyPayment * loan.months
  const totalInterest = totalPaid - loan.amount

  // Inversión alternativa: ¿qué pasaría si invirtieras la cuota al 7%?
  const altInvestment = useMemo(() => {
    if (monthlyPayment <= 0) return 0
    const r = 0.07 / 12
    return monthlyPayment * ((Math.pow(1 + r, loan.months) - 1) / r)
  }, [monthlyPayment, loan.months])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Calculator style={{ color: "#22C55E" }} /> Calculadora
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
          Proyecta tus ahorros o evalúa si vale la pena tomar un préstamo
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 rounded-xl w-fit"
        style={{ background: "var(--bg-input)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {([
          { key: "ahorro",   label: "📈 Calculadora de Ahorro",   },
          { key: "prestamo", label: "💳 Calculadora de Préstamo",  },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === key ? "rgba(34,197,94,0.15)" : "transparent",
              color:      tab === key ? "#4ADE80"              : "#64748B",
              border:     tab === key ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ TAB AHORRO ═══════════════════ */}
      {tab === "ahorro" && (
        <div className="fade-in space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-5">Parámetros</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Ahorro inicial</label>
                  <input type="number" step="100" min="0" className="input-dark" placeholder="$0.00"
                    value={savForm.initialAmount} onChange={(e) => setSavForm({ ...savForm, initialAmount: e.target.value })} />
                  <div className="text-xs mt-1" style={{ color: "#64748B" }}>¿Cuánto tienes ahorrado hoy?</div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Ahorro mensual</label>
                  <input type="number" step="100" min="0" className="input-dark" placeholder="$0.00"
                    value={savForm.monthlyAmount} onChange={(e) => setSavForm({ ...savForm, monthlyAmount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Tasa anual: <span style={{ color: "#22C55E" }}>{sav.rate}%</span>
                  </label>
                  <input type="range" min="0" max="20" step="0.5" className="w-full accent-emerald-500"
                    value={savForm.annualRate} onChange={(e) => setSavForm({ ...savForm, annualRate: e.target.value })} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                    <span>0%</span><span>20%</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>CETES: ~10% · ETFs: ~7%</div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Plazo: <span style={{ color: "#22C55E" }}>{sav.years} años</span>
                  </label>
                  <input type="range" min="1" max="40" step="1" className="w-full accent-emerald-500"
                    value={savForm.years} onChange={(e) => setSavForm({ ...savForm, years: e.target.value })} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                    <span>1 año</span><span>40 años</span>
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
                  <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>en {sav.years} años</div>
                </div>
                <div className="stat-card p-5">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Aportado</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(totalContributed)}</div>
                  <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Capital propio</div>
                </div>
                <div className="stat-card p-5">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Intereses ganados</div>
                  <div className="text-xl font-bold text-indigo-400">{formatCurrency(totalSavInterest)}</div>
                  <div className="text-xs mt-1" style={{ color: "#10B981" }}>
                    {totalContributed > 0 ? `+${((totalSavInterest / totalContributed) * 100).toFixed(0)}% extra` : ""}
                  </div>
                </div>
              </div>

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
                    <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
                    <Tooltip content={<SavingsTooltip />} />
                    <Area type="monotone" dataKey="contributed" name="Capital aportado" stroke="#6366F1" fill="url(#contributedGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="balance"     name="Saldo total"      stroke="#10B981" fill="url(#balanceGrad)"     strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla anual */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Tabla de proyección anual</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
                    {["Año", "Saldo Total", "Capital Aportado", "Intereses Ganados", "Rentabilidad"].map((h) => (
                      <th key={h} className="text-left pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((row) => (
                    <tr key={row.year} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="py-2.5 pr-4 font-medium text-white">Año {row.year}</td>
                      <td className="py-2.5 pr-4 text-emerald-400 font-semibold">{formatCurrency(row.balance)}</td>
                      <td className="py-2.5 pr-4" style={{ color: "#94A3B8" }}>{formatCurrency(row.contributed)}</td>
                      <td className="py-2.5 pr-4 text-indigo-400">{formatCurrency(row.interest)}</td>
                      <td className="py-2.5 pr-4 text-emerald-400">
                        {row.contributed > 0 ? `+${((row.interest / row.contributed) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Meta mensual */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} style={{ color: "#22C55E" }} />
              <h2 className="text-base font-semibold text-white">¿Cuánto necesito ahorrar para mi meta?</h2>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              {[500000, 1000000, 2000000].map((goal) => {
                const r = sav.rate / 100 / 12
                const n = sav.years * 12
                const monthlyNeeded = r > 0
                  ? (goal - sav.initial * Math.pow(1 + r, n)) / ((Math.pow(1 + r, n) - 1) / r)
                  : (goal - sav.initial) / n
                return (
                  <div key={goal} className="p-5 rounded-xl text-center"
                    style={{ background: "var(--bg-hover)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <div className="text-sm font-medium mb-2" style={{ color: "#94A3B8" }}>Meta</div>
                    <div className="text-2xl font-bold text-white mb-1">{formatCurrency(goal)}</div>
                    <div className="text-xs mb-2" style={{ color: "#64748B" }}>en {sav.years} años necesitas:</div>
                    <div className="text-xl font-bold text-emerald-400">
                      {monthlyNeeded > 0 ? `${formatCurrency(Math.ceil(monthlyNeeded))}/mes` : "✓ Ya alcanzado"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB PRÉSTAMO ═══════════════════ */}
      {tab === "prestamo" && (
        <div className="fade-in space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <CreditCard size={18} style={{ color: "#EF4444" }} /> Parámetros del Préstamo
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Monto del préstamo</label>
                  <input type="number" step="1000" min="0" className="input-dark" placeholder="$50,000"
                    value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Tasa anual (%): <span style={{ color: "#EF4444" }}>{loan.rate}%</span>
                  </label>
                  <input type="range" min="0" max="120" step="0.5" className="w-full accent-red-500"
                    value={loanForm.rate} onChange={(e) => setLoanForm({ ...loanForm, rate: e.target.value })} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                    <span>0%</span><span>120%</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                    Hipoteca: ~12% · Banco: ~20-30% · Personal: ~40-60% · TDC: ~50-100%
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Plazo: <span style={{ color: "#EF4444" }}>{loan.months} meses ({(loan.months / 12).toFixed(1)} años)</span>
                  </label>
                  <input type="range" min="1" max="360" step="1" className="w-full accent-red-500"
                    value={loanForm.months} onChange={(e) => setLoanForm({ ...loanForm, months: e.target.value })} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                    <span>1 mes</span><span>360 meses</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Pago extra mensual</label>
                  <input type="number" step="100" min="0" className="input-dark" placeholder="$0"
                    value={loanForm.extra} onChange={(e) => setLoanForm({ ...loanForm, extra: e.target.value })} />
                  <div className="text-xs mt-1" style={{ color: "#64748B" }}>Reduce el plazo real del préstamo</div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 text-center">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Cuota mensual</div>
                <div className="text-4xl font-bold text-red-400">{formatCurrency(monthlyPayment)}</div>
                <div className="text-sm mt-1" style={{ color: "#94A3B8" }}>por {loan.months} meses</div>
                {loan.extra > 0 && (
                  <div className="text-xs mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                    + {formatCurrency(loan.extra)} extra = {formatCurrency(monthlyPayment + loan.extra)}/mes total
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card p-4 text-center">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total pagado</div>
                  <div className="text-lg font-bold text-white">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="stat-card p-4 text-center">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total intereses</div>
                  <div className="text-lg font-bold text-red-400">{formatCurrency(totalInterest)}</div>
                </div>
              </div>

              {/* Barra Capital vs Intereses */}
              <div className="glass-card rounded-2xl p-4">
                <div className="text-xs font-medium mb-2" style={{ color: "#64748B" }}>Intereses vs Capital</div>
                <div className="h-3 rounded-full overflow-hidden flex mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full" style={{ width: `${totalPaid > 0 ? (loan.amount / totalPaid) * 100 : 0}%`, background: "linear-gradient(90deg,#10B981,#059669)" }} />
                  <div className="h-full flex-1" style={{ background: "linear-gradient(90deg,#DC2626,#EF4444)" }} />
                </div>
                <div className="flex justify-between text-xs" style={{ color: "#64748B" }}>
                  <span style={{ color: "#10B981" }}>Capital: {formatCurrency(loan.amount)}</span>
                  <span style={{ color: "#EF4444" }}>Intereses: {formatCurrency(totalInterest)}</span>
                </div>
                <div className="text-xs mt-2" style={{ color: "#94A3B8" }}>
                  Pagas {totalPaid > 0 ? formatPercent((totalInterest / loan.amount) * 100) : "0%"} extra en intereses
                </div>
              </div>
            </div>

            {/* ¿Vale la pena? */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">💡 ¿Vale la pena tomarlo?</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#10B981" }}>✅ Si pagas de contado</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(loan.amount)}</div>
                  <div className="text-xs mt-1 text-emerald-400">Ahorras {formatCurrency(totalInterest)} en intereses</div>
                </div>

                <div className="p-4 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#EF4444" }}>💳 Si lo financias</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(totalPaid)}</div>
                  <div className="text-xs mt-1" style={{ color: "#64748B" }}>{formatCurrency(monthlyPayment)}/mes × {loan.months} meses</div>
                  <div className="text-xs mt-1 text-red-400">
                    El bien te cuesta {formatPercent((totalInterest / Math.max(1, loan.amount)) * 100)} más
                  </div>
                </div>

                <div className="p-3 rounded-xl text-xs"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#D97706" }}>
                  <strong>📈 Alternativa:</strong> Si invirtieras {formatCurrency(monthlyPayment)}/mes al 7% anual
                  durante {loan.months} meses, tendrías{" "}
                  <strong style={{ color: "#F59E0B" }}>{formatCurrency(altInvestment)}</strong> —{" "}
                  {altInvestment > totalPaid
                    ? <span style={{ color: "#10B981" }}>más que el total que pagarías de intereses.</span>
                    : <span>considera si la necesidad justifica el costo.</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de amortización */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-white">Tabla de Amortización</h3>
              <button onClick={() => setShowAmortTable(!showAmortTable)}
                className="text-xs font-medium underline underline-offset-2"
                style={{ color: "#6366F1" }}>
                {showAmortTable ? "Ocultar" : `Ver ${loan.months} pagos`}
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "#64748B" }}>
              Verde = capital · Rojo = intereses · La tabla se detiene cuando el saldo llega a cero.
            </p>
            {showAmortTable && (
              <AmortizationTable
                principal={loan.amount}
                annualRate={loan.rate}
                months={loan.months}
                extraPayment={loan.extra}
              />
            )}
            {!showAmortTable && (
              <button onClick={() => setShowAmortTable(true)}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(99,102,241,0.08)", color: "#818CF8", border: "1px dashed rgba(99,102,241,0.25)" }}>
                Mostrar tabla de amortización completa
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
