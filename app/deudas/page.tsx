"use client"

import { useEffect, useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, Cell,
} from "recharts"
import { CreditCard, Plus, Trash2, Calculator, Flame, AlertCircle } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────
interface Debt {
  id: string; name: string; balance: number; originalBalance: number
  interestRate: number; minimumPayment: number; type: string
}

const DEBT_TYPES = [
  { value: "credit", label: "Tarjeta de Crédito", icon: "💳", color: "#EF4444" },
  { value: "personal", label: "Préstamo Personal", icon: "👤", color: "#F59E0B" },
  { value: "auto", label: "Crédito Automotriz", icon: "🚗", color: "#6366F1" },
  { value: "mortgage", label: "Hipoteca", icon: "🏠", color: "#8B5CF6" },
  { value: "student", label: "Crédito Educativo", icon: "🎓", color: "#14B8A6" },
  { value: "other", label: "Otro", icon: "📄", color: "#94A3B8" },
]

function getDebtType(type: string) {
  return DEBT_TYPES.find((t) => t.value === type) ?? DEBT_TYPES[5]
}

// ─── Loan Calculator Logic ────────────────────────────────────────────────
function calcMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function buildAmortization(principal: number, annualRate: number, months: number) {
  const monthly = calcMonthlyPayment(principal, annualRate, months)
  const r = annualRate / 100 / 12
  let balance = principal
  const rows = []
  for (let i = 1; i <= months; i++) {
    const interest = balance * r
    const principalPaid = monthly - interest
    balance = Math.max(0, balance - principalPaid)
    rows.push({
      month: i,
      payment: monthly,
      principal: principalPaid,
      interest,
      balance,
    })
  }
  return rows
}

// ─── Debt Snowball Logic ──────────────────────────────────────────────────
interface SnowballDebt {
  id: string; name: string; balance: number; originalBalance: number
  interestRate: number; minimumPayment: number; type: string
  color: string; paidOffMonth: number | null; totalInterestPaid: number
}

function simulateSnowball(debts: Debt[], extraPayment: number) {
  if (debts.length === 0) return { results: [], totalMonths: 0, totalInterest: 0 }

  // Smallest balance first (snowball method)
  const states: SnowballDebt[] = [...debts]
    .sort((a, b) => a.balance - b.balance)
    .map((d) => ({
      ...d,
      color: DEBT_TYPES.find((t) => t.value === d.type)?.color ?? "#94A3B8",
      paidOffMonth: null,
      balance: d.balance,
      originalBalance: d.balance,
      totalInterestPaid: 0,
    }))

  let month = 0
  const MAX_MONTHS = 600

  while (states.some((s) => s.balance > 0.01) && month < MAX_MONTHS) {
    month++

    // 1. Accrue interest on all active debts
    states.forEach((s) => {
      if (s.balance > 0.01) {
        const interest = s.balance * (s.interestRate / 100 / 12)
        s.balance += interest
        s.totalInterestPaid += interest
      }
    })

    // 2. Extra available = fixed extraPayment + minimums of already paid-off debts (snowball roll)
    let rolledExtra = extraPayment
    states.forEach((s) => {
      if (s.paidOffMonth !== null) rolledExtra += s.minimumPayment
    })

    // 3. Pay minimums on all active debts
    states.forEach((s) => {
      if (s.balance > 0.01 && s.paidOffMonth === null) {
        const pay = Math.min(s.minimumPayment, s.balance)
        s.balance -= pay
        if (s.balance < 0.01) {
          s.balance = 0
          s.paidOffMonth = month
        }
      }
    })

    // 4. Apply rolled extra to first active (smallest) debt
    const target = states.find((s) => s.balance > 0.01 && s.paidOffMonth === null)
    if (target) {
      const pay = Math.min(rolledExtra, target.balance)
      target.balance -= pay
      if (target.balance < 0.01) {
        target.balance = 0
        target.paidOffMonth = month
      }
    }
  }

  const totalInterest = states.reduce((s, d) => s + d.totalInterestPaid, 0)
  return { results: states, totalMonths: month, totalInterest }
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────
const AmortTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#0D1B33", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px" }}>
      <div className="text-xs font-semibold text-white mb-2">Mes {label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-xs flex gap-2 mb-0.5">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DeudasPage() {
  const [tab, setTab] = useState<"calc" | "extincion">("calc")
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showAmort, setShowAmort] = useState(false)

  // Loan calculator state
  const [loanForm, setLoanForm] = useState({
    amount: "50000", rate: "24", months: "24",
  })

  // Extinction state
  const [debtForm, setDebtForm] = useState({
    name: "", balance: "", interestRate: "", minimumPayment: "", type: "credit",
  })
  const [extraPayment, setExtraPayment] = useState("500")
  const [monthlySalary, setMonthlySalary] = useState("")

  const fetchDebts = () => {
    fetch("/api/debts")
      .then((r) => r.json())
      .then(setDebts)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDebts() }, [])

  // ── Loan Calculator ──
  const loanAmount = parseFloat(loanForm.amount) || 0
  const loanRate = parseFloat(loanForm.rate) || 0
  const loanMonths = parseInt(loanForm.months) || 1

  const monthlyPayment = useMemo(() =>
    loanAmount > 0 ? calcMonthlyPayment(loanAmount, loanRate, loanMonths) : 0,
    [loanAmount, loanRate, loanMonths]
  )
  const totalPaid = monthlyPayment * loanMonths
  const totalInterest = totalPaid - loanAmount
  const amortData = useMemo(() =>
    loanAmount > 0 ? buildAmortization(loanAmount, loanRate, loanMonths) : [],
    [loanAmount, loanRate, loanMonths]
  )
  // Chart data: sample every Nth month to keep it manageable
  const chartStep = Math.max(1, Math.floor(loanMonths / 24))
  const amortChartData = amortData.filter((_, i) => i % chartStep === 0 || i === amortData.length - 1)

  // ── Snowball ──
  const extra = parseFloat(extraPayment) || 0
  const salary = parseFloat(monthlySalary) || 0
  const { results: snowballResults, totalMonths, totalInterest: snowballInterest } = useMemo(
    () => simulateSnowball(debts, extra),
    [debts, extra]
  )
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const totalMinimums = debts.reduce((s, d) => s + d.minimumPayment, 0)
  const monthlyDebtBurden = salary > 0 ? (totalMinimums / salary) * 100 : 0

  // Snowball bar chart data
  const snowballChartData = snowballResults.map((d) => ({
    name: d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name,
    months: d.paidOffMonth ?? totalMonths,
    color: d.color,
  }))

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(debtForm),
      })
      setDebtForm({ name: "", balance: "", interestRate: "", minimumPayment: "", type: "credit" })
      setShowForm(false)
      fetchDebts()
    } finally { setSubmitting(false) }
  }

  const handleDeleteDebt = async (id: string) => {
    if (!confirm("¿Eliminar esta deuda?")) return
    await fetch(`/api/debts/${id}`, { method: "DELETE" })
    setDebts((prev) => prev.filter((d) => d.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard style={{ color: "#EF4444" }} /> Deudas y Préstamos
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">
          Calcula préstamos y aplica el método bola de nieve para liberarte de deudas
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 rounded-xl w-fit"
        style={{ background: "rgba(6,13,31,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {([
          { key: "calc", label: "📊 Calculadora de Préstamo", },
          { key: "extincion", label: "🔥 Extinción de Deudas", },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === key ? "rgba(239,68,68,0.2)" : "transparent",
              color: tab === key ? "#F87171" : "#64748B",
              border: tab === key ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ TAB 1: LOAN CALCULATOR ═══════════════════ */}
      {tab === "calc" && (
        <div className="space-y-6 fade-in">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <Calculator size={18} style={{ color: "#EF4444" }} /> Parámetros del Préstamo
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Monto del préstamo
                  </label>
                  <input type="number" className="input-dark" placeholder="50,000"
                    value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Tasa de interés anual (%): <span style={{ color: "#EF4444" }}>{loanRate}%</span>
                  </label>
                  <input type="range" min="0" max="120" step="0.5" className="w-full accent-red-500"
                    value={loanForm.rate} onChange={(e) => setLoanForm({ ...loanForm, rate: e.target.value })} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                    <span>0% (sin interés)</span>
                    <span>120% (muy alto)</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                    INFONAVIT: ~12% · Banco: ~20-30% · Crédito personal: ~40-60% · TDC: ~50-100%
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                    Plazo: <span style={{ color: "#EF4444" }}>{loanMonths} meses ({(loanMonths / 12).toFixed(1)} años)</span>
                  </label>
                  <input type="range" min="1" max="360" step="1" className="w-full accent-red-500"
                    value={loanForm.months} onChange={(e) => setLoanForm({ ...loanForm, months: e.target.value })} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#64748B" }}>
                    <span>1 mes</span>
                    <span>360 meses (30 años)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Pago mensual</div>
                <div className="text-4xl font-bold text-red-400">{formatCurrency(monthlyPayment)}</div>
                <div className="text-sm mt-1" style={{ color: "#94A3B8" }}>por {loanMonths} meses</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card p-4">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total pagado</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="stat-card p-4">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total intereses</div>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(totalInterest)}</div>
                </div>
              </div>
              {/* Interest % of principal */}
              <div className="stat-card p-4">
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>
                  Intereses vs Capital
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#94A3B8" }}>Capital: {formatCurrency(loanAmount)}</span>
                  <span style={{ color: "#EF4444" }}>Intereses: {formatCurrency(totalInterest)}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="h-full" style={{
                    width: `${(loanAmount / totalPaid) * 100}%`,
                    background: "linear-gradient(90deg, #10B981, #059669)"
                  }} />
                  <div className="h-full flex-1" style={{ background: "linear-gradient(90deg, #DC2626, #EF4444)" }} />
                </div>
                <div className="text-xs mt-1.5" style={{ color: "#64748B" }}>
                  Pagas {formatPercent((totalInterest / Math.max(1, loanAmount)) * 100)} extra en intereses
                </div>
              </div>
            </div>

            {/* Cash vs Financing */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">💵 Contado vs Financiado</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#10B981" }}>✅ Si pagas de contado</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(loanAmount)}</div>
                  <div className="text-xs mt-1" style={{ color: "#64748B" }}>Costo real del bien</div>
                  <div className="text-xs mt-2 text-emerald-400">Ahorras {formatCurrency(totalInterest)} en intereses</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#EF4444" }}>💳 Si lo financias</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(totalPaid)}</div>
                  <div className="text-xs mt-1" style={{ color: "#64748B" }}>{formatCurrency(monthlyPayment)}/mes × {loanMonths} meses</div>
                  <div className="text-xs mt-2 text-red-400">El bien te cuesta {formatPercent((totalInterest / Math.max(1, loanAmount)) * 100)} más de su precio</div>
                </div>

                {/* Break-even insight */}
                <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#D97706" }}>
                  <strong>💡 Perspectiva:</strong> Si invirtieras {formatCurrency(monthlyPayment)}/mes al 7% anual durante {loanMonths} meses en lugar de pagarlo financiado, tendrías{" "}
                  <strong style={{ color: "#F59E0B" }}>
                    {formatCurrency(
                      Array.from({ length: loanMonths }).reduce<number>(
                        (acc) => acc * (1 + 0.07 / 12) + monthlyPayment, 0
                      )
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Amortization Chart */}
          {loanAmount > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Tabla de amortización</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                    Verde = capital · Rojo = intereses — observa cómo cambia la proporción
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={amortChartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                  <defs>
                    <linearGradient id="principalG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="interestG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                    label={{ value: "Mes", position: "insideBottom", fill: "#64748B", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
                  <Tooltip content={<AmortTooltip />} />
                  <Area type="monotone" dataKey="balance" name="Saldo pendiente"
                    stroke="#6366F1" fill="none" strokeWidth={2} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="principal" name="Capital pagado"
                    stroke="#10B981" fill="url(#principalG)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="interest" name="Interés pagado"
                    stroke="#EF4444" fill="url(#interestG)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-2">
                {[
                  { color: "#6366F1", label: "Saldo pendiente", dash: true },
                  { color: "#10B981", label: "Capital por pago" },
                  { color: "#EF4444", label: "Interés por pago" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
                    <div className="w-4 h-1.5 rounded" style={{ background: l.color, opacity: l.dash ? 0.6 : 1 }} />
                    {l.label}
                  </div>
                ))}
              </div>

              {/* Amortization table toggle */}
              <button onClick={() => setShowAmort(!showAmort)}
                className="mt-4 text-xs font-medium underline-offset-2 underline"
                style={{ color: "#6366F1" }}>
                {showAmort ? "Ocultar" : "Ver"} tabla completa ({loanMonths} pagos)
              </button>

              {showAmort && (
                <div className="mt-4 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: "#0D1B33" }}>
                      <tr style={{ borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
                        {["Mes", "Cuota", "Capital", "Interés", "Saldo"].map((h) => (
                          <th key={h} className="text-left pb-2 pr-3 font-medium uppercase tracking-wider"
                            style={{ color: "#64748B" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {amortData.map((row) => (
                        <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                          className="hover:bg-white/5">
                          <td className="py-1.5 pr-3" style={{ color: "#94A3B8" }}>{row.month}</td>
                          <td className="py-1.5 pr-3 text-white">{formatCurrency(row.payment)}</td>
                          <td className="py-1.5 pr-3 text-emerald-400">{formatCurrency(row.principal)}</td>
                          <td className="py-1.5 pr-3 text-red-400">{formatCurrency(row.interest)}</td>
                          <td className="py-1.5 pr-3" style={{ color: "#94A3B8" }}>{formatCurrency(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB 2: DEBT SNOWBALL ═══════════════════ */}
      {tab === "extincion" && (
        <div className="space-y-6 fade-in">
          {/* Info card */}
          <div className="p-4 rounded-xl flex gap-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Flame size={20} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: "#F59E0B" }}>Método Bola de Nieve — El Hombre Más Rico de Babilonia</div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                Paga el mínimo en todas tus deudas excepto la más pequeña. Concentra todo el dinero extra en eliminarla.
                Cuando la pagues, ese dinero lo "ruedas" a la siguiente. Como una bola de nieve que crece mientras baja la montaña.
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">⚙️ Parámetros</h2>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                  Pago extra mensual disponible
                </label>
                <input type="number" className="input-dark" placeholder="500"
                  value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} />
                <div className="text-xs mt-1" style={{ color: "#64748B" }}>
                  Dinero adicional después de los mínimos
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                  Ingreso mensual neto (opcional)
                </label>
                <input type="number" className="input-dark" placeholder="15,000"
                  value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
              </div>

              {/* Summary */}
              <div className="pt-4 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#94A3B8" }}>Total deuda</span>
                  <span className="font-semibold text-red-400">{formatCurrency(totalDebt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#94A3B8" }}>Mínimos/mes</span>
                  <span className="font-semibold text-white">{formatCurrency(totalMinimums)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#94A3B8" }}>Intereses totales</span>
                  <span className="font-semibold text-red-400">{formatCurrency(snowballInterest)}</span>
                </div>
                {totalMonths > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#94A3B8" }}>Libre de deudas en</span>
                    <span className="font-bold text-emerald-400">
                      {totalMonths} meses ({(totalMonths / 12).toFixed(1)} años)
                    </span>
                  </div>
                )}
                {salary > 0 && (
                  <div className="p-3 rounded-xl mt-2" style={{
                    background: monthlyDebtBurden > 40 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)",
                    border: `1px solid ${monthlyDebtBurden > 40 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)"}`,
                  }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: monthlyDebtBurden > 40 ? "#F87171" : "#10B981" }}>
                      {monthlyDebtBurden > 40 ? "⚠️ Deuda alta" : "✅ Nivel aceptable"}
                    </div>
                    <div className="text-xs" style={{ color: "#94A3B8" }}>
                      Tus mínimos representan el{" "}
                      <strong style={{ color: monthlyDebtBurden > 40 ? "#F87171" : "#10B981" }}>
                        {formatPercent(monthlyDebtBurden)}
                      </strong>{" "}
                      de tu salario. Lo ideal es menos del 30%.
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full flex items-center justify-center gap-2">
                <Plus size={16} /> Agregar Deuda
              </button>
            </div>

            {/* Debt list + form */}
            <div className="lg:col-span-2 space-y-4">
              {showForm && (
                <div className="glass-card rounded-2xl p-5 fade-in">
                  <h3 className="text-base font-semibold text-white mb-4">Nueva Deuda</h3>
                  <form onSubmit={handleAddDebt}>
                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Nombre *</label>
                        <input type="text" required className="input-dark text-sm" placeholder="Ej: Tarjeta BBVA"
                          value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Tipo</label>
                        <select className="input-dark text-sm" value={debtForm.type}
                          onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value })}>
                          {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Saldo actual *</label>
                        <input type="number" step="0.01" min="0" required className="input-dark text-sm" placeholder="$0.00"
                          value={debtForm.balance} onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Tasa anual (%) *</label>
                        <input type="number" step="0.1" min="0" required className="input-dark text-sm" placeholder="24"
                          value={debtForm.interestRate} onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Pago mínimo/mes *</label>
                        <input type="number" step="0.01" min="0" required className="input-dark text-sm" placeholder="$0.00"
                          value={debtForm.minimumPayment} onChange={(e) => setDebtForm({ ...debtForm, minimumPayment: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={submitting}
                        className="py-2 px-5 rounded-xl font-semibold text-sm text-white"
                        style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}>
                        {submitting ? "Guardando..." : "Agregar"}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)}
                        className="py-2 px-5 rounded-xl text-sm font-medium"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {debts.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center">
                  <div className="text-5xl mb-3">💸</div>
                  <div className="text-lg font-semibold text-white mb-2">Sin deudas registradas</div>
                  <p style={{ color: "#64748B" }} className="text-sm mb-4">
                    Agrega tus tarjetas, préstamos y créditos para ver el plan de extinción
                  </p>
                  <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
                    Agregar mi primera deuda
                  </button>
                </div>
              ) : (
                <>
                  {/* Snowball Order */}
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-base font-semibold text-white mb-1">🎯 Orden de ataque (Bola de Nieve)</h3>
                    <p className="text-xs mb-4" style={{ color: "#64748B" }}>
                      De menor a mayor saldo. Paga el mínimo en todas, concentra el extra en la #1.
                    </p>
                    <div className="space-y-3">
                      {snowballResults.map((debt, idx) => {
                        const pctPaid = debt.originalBalance > 0
                          ? Math.min(100, ((debt.originalBalance - (debt.paidOffMonth ? 0 : debt.balance)) / debt.originalBalance) * 100)
                          : 0
                        const isTarget = idx === 0
                        return (
                          <div key={debt.id} className="p-4 rounded-xl relative overflow-hidden"
                            style={{
                              background: isTarget ? `${debt.color}12` : "rgba(6,13,31,0.5)",
                              border: `1px solid ${isTarget ? debt.color + "40" : "rgba(255,255,255,0.06)"}`,
                            }}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                  style={{ background: debt.color + "20", color: debt.color }}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                                    {debt.name}
                                    {isTarget && <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                      style={{ background: debt.color + "25", color: debt.color }}>OBJETIVO</span>}
                                  </div>
                                  <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                                    {getDebtType(debt.type).icon} {formatPercent(debt.interestRate)} anual ·
                                    Mín: {formatCurrency(debt.minimumPayment)}/mes
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-lg font-bold text-white">{formatCurrency(debt.balance)}</div>
                                {debt.paidOffMonth && (
                                  <div className="text-xs text-emerald-400">
                                    Libre en mes {debt.paidOffMonth} ({(debt.paidOffMonth / 12).toFixed(1)} años)
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${pctPaid}%`, background: debt.color }} />
                            </div>
                            <button onClick={() => handleDeleteDebt(debt.id)}
                              className="absolute top-3 right-3 btn-danger p-1">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Timeline Chart */}
                  {snowballChartData.length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h3 className="text-base font-semibold text-white mb-1">📅 Línea de tiempo</h3>
                      <p className="text-xs mb-4" style={{ color: "#64748B" }}>Meses hasta liquidar cada deuda</p>
                      <ResponsiveContainer width="100%" height={Math.max(120, snowballChartData.length * 45)}>
                        <BarChart data={snowballChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                          <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                            label={{ value: "Meses", position: "insideBottom", fill: "#64748B", fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }}
                            axisLine={false} tickLine={false} width={100} />
                          <Tooltip formatter={(v) => [`${v} meses (${(Number(v) / 12).toFixed(1)} años)`, "Tiempo"]} />
                          <Bar dataKey="months" radius={[0, 6, 6, 0]}>
                            {snowballChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                          {totalMonths > 0 && (
                            <ReferenceLine x={totalMonths} stroke="#10B981" strokeDasharray="4 2"
                              label={{ value: "Libre", position: "top", fill: "#10B981", fontSize: 10 }} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Final summary */}
                      {totalMonths > 0 && (
                        <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            <div>
                              <div className="text-xs mb-1" style={{ color: "#64748B" }}>Libre en</div>
                              <div className="text-xl font-bold text-emerald-400">{totalMonths} meses</div>
                              <div className="text-xs" style={{ color: "#94A3B8" }}>{(totalMonths / 12).toFixed(1)} años</div>
                            </div>
                            <div>
                              <div className="text-xs mb-1" style={{ color: "#64748B" }}>Deuda total</div>
                              <div className="text-xl font-bold text-white">{formatCurrency(totalDebt)}</div>
                            </div>
                            <div>
                              <div className="text-xs mb-1" style={{ color: "#64748B" }}>Intereses totales</div>
                              <div className="text-xl font-bold text-red-400">{formatCurrency(snowballInterest)}</div>
                            </div>
                            <div>
                              <div className="text-xs mb-1" style={{ color: "#64748B" }}>Pago mensual total</div>
                              <div className="text-xl font-bold text-white">{formatCurrency(totalMinimums + extra)}</div>
                              {salary > 0 && (
                                <div className="text-xs" style={{ color: "#64748B" }}>
                                  {formatPercent(((totalMinimums + extra) / salary) * 100)} del salario
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
