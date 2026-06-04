"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts"
import {
  CreditCard, Plus, Trash2, Flame, Snowflake, ChevronRight,
  Settings2, ChevronDown, ChevronUp,
} from "lucide-react"
import { formatPercent } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"

interface Debt {
  id: string; name: string; balance: number; originalBalance: number
  interestRate: number; minimumPayment: number; type: string
  termMonths: number | null; lifeInsurance: number | null
  debtInsurance: number | null; isMixedRate: boolean
}

const DEBT_TYPES = [
  { value: "credit",   label: "Tarjeta de Crédito", icon: "💳", color: "#EF4444" },
  { value: "personal", label: "Préstamo Personal",   icon: "👤", color: "#F59E0B" },
  { value: "auto",     label: "Crédito Automotriz",  icon: "🚗", color: "#6366F1" },
  { value: "mortgage", label: "Hipoteca",             icon: "🏠", color: "#8B5CF6" },
  { value: "student",  label: "Crédito Educativo",   icon: "🎓", color: "#14B8A6" },
  { value: "other",    label: "Otro",                 icon: "📄", color: "#94A3B8" },
]

type Strategy = "snowball" | "avalanche"

interface SimDebt extends Debt {
  color: string; paidOffMonth: number | null; totalInterestPaid: number
  simBalance: number
}

function simulate(debts: Debt[], strategy: Strategy, extra: number) {
  if (!debts.length) return { results: [] as SimDebt[], totalMonths: 0, totalInterest: 0 }

  const sorted = [...debts].sort((a, b) =>
    strategy === "snowball" ? a.balance - b.balance : b.interestRate - a.interestRate
  )

  const states: SimDebt[] = sorted.map((d) => ({
    ...d,
    color: DEBT_TYPES.find((t) => t.value === d.type)?.color ?? "#94A3B8",
    paidOffMonth: null,
    simBalance: d.balance,
    totalInterestPaid: 0,
  }))

  let month = 0
  const MAX = 600

  while (states.some((s) => s.simBalance > 0.01) && month < MAX) {
    month++
    let rolled = extra

    // 1. Intereses
    states.forEach((s) => {
      if (s.simBalance > 0.01) {
        const int = s.simBalance * (s.interestRate / 100 / 12)
        s.simBalance += int
        s.totalInterestPaid += int
      }
    })

    // 2. Sumar mínimos de deudas ya pagadas (efecto bola de nieve)
    states.forEach((s) => { if (s.paidOffMonth !== null) rolled += s.minimumPayment })

    // 3. Mínimos en deudas activas
    states.forEach((s) => {
      if (s.simBalance > 0.01 && s.paidOffMonth === null) {
        const pay = Math.min(s.minimumPayment, s.simBalance)
        s.simBalance -= pay
        if (s.simBalance < 0.01) { s.simBalance = 0; s.paidOffMonth = month }
      }
    })

    // 4. Extra al objetivo (primero de la lista ordenada que sigue activo)
    const target = states.find((s) => s.simBalance > 0.01 && s.paidOffMonth === null)
    if (target) {
      const pay = Math.min(rolled, target.simBalance)
      target.simBalance -= pay
      if (target.simBalance < 0.01) { target.simBalance = 0; target.paidOffMonth = month }
    }
  }

  return {
    results: states,
    totalMonths: month,
    totalInterest: states.reduce((s, d) => s + d.totalInterestPaid, 0),
  }
}

export default function DeudasPage() {
  const router = useRouter()
  const [debts, setDebts]     = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>("snowball")
  const [extraPayment, setExtraPayment] = useState("0")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [form, setForm] = useState({
    name: "", balance: "", interestRate: "", minimumPayment: "", type: "credit",
    termMonths: "", lifeInsurance: "", debtInsurance: "", isMixedRate: false,
  })

  const fetchDebts = () =>
    fetch("/api/debts").then((r) => r.json()).then(setDebts).finally(() => setLoading(false))

  useEffect(() => { fetchDebts() }, [])

  const extra = parseFloat(extraPayment) || 0
  const { results, totalMonths, totalInterest } = useMemo(
    () => simulate(debts, strategy, extra),
    [debts, strategy, extra]
  )

  const totalDebt     = debts.reduce((s, d) => s + d.balance, 0)
  const totalMinimums = debts.reduce((s, d) => s + d.minimumPayment, 0)

  const chartData = results.map((d) => ({
    name: d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name,
    months: d.paidOffMonth ?? totalMonths,
    color: d.color,
  }))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setForm({ name: "", balance: "", interestRate: "", minimumPayment: "", type: "credit", termMonths: "", lifeInsurance: "", debtInsurance: "", isMixedRate: false })
      setShowForm(false)
      setShowAdvanced(false)
      fetchDebts()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar esta deuda?")) return
    const res = await fetch(`/api/debts/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("No se pudo eliminar la deuda. Intenta de nuevo.")
      return
    }
    fetchDebts()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard style={{ color: "#EF4444" }} /> Deudas
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Estrategia de extinción y seguimiento de tus préstamos
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg,#DC2626,#EF4444)", color: "white" }}>
          <Plus size={16} /> Nueva Deuda
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 fade-in">
          <h2 className="text-base font-semibold text-white mb-4">Agregar Deuda</h2>
          <form onSubmit={handleAdd}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Nombre *</label>
                <input required className="input-dark text-sm" placeholder="Ej: Tarjeta BBVA"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Tipo</label>
                <select className="input-dark text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Saldo actual *</label>
                <input required type="number" step="0.01" min="0" className="input-dark text-sm" placeholder="$0.00"
                  value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Tasa anual (%) *</label>
                <input required type="number" step="0.1" min="0" className="input-dark text-sm" placeholder="24"
                  value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Pago mínimo/mes *</label>
                <input required type="number" step="0.01" min="0" className="input-dark text-sm" placeholder="$0.00"
                  value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} />
              </div>
            </div>

            {/* Opciones avanzadas */}
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium mb-3"
              style={{ color: showAdvanced ? "#6366F1" : "#64748B" }}>
              <Settings2 size={12} />
              Opciones avanzadas de préstamo
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showAdvanced && (
              <div className="grid md:grid-cols-2 gap-3 mb-3 p-4 rounded-xl"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Plazo (meses)</label>
                  <input type="number" min="1" className="input-dark text-sm" placeholder="Ej: 60"
                    value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Seguro de vida (mensual)</label>
                  <input type="number" step="0.01" min="0" className="input-dark text-sm" placeholder="$0.00"
                    value={form.lifeInsurance} onChange={(e) => setForm({ ...form, lifeInsurance: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "#94A3B8" }}>Seguro de daños (mensual)</label>
                  <input type="number" step="0.01" min="0" className="input-dark text-sm" placeholder="$0.00"
                    value={form.debtInsurance} onChange={(e) => setForm({ ...form, debtInsurance: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 pt-3">
                  <input type="checkbox" id="isMixed" checked={form.isMixedRate}
                    onChange={(e) => setForm({ ...form, isMixedRate: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500" />
                  <label htmlFor="isMixed" className="text-xs font-medium cursor-pointer" style={{ color: "#94A3B8" }}>
                    Tasa mixta / variable
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="py-2 px-5 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(135deg,#DC2626,#EF4444)" }}>
                {submitting ? "Guardando..." : "Agregar"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setShowAdvanced(false) }}
                className="py-2 px-5 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="text-5xl mb-3">💸</div>
          <div className="text-xl font-semibold text-white mb-2">Sin deudas registradas</div>
          <p className="text-sm mb-5" style={{ color: "#64748B" }}>
            Agrega tus tarjetas, préstamos y créditos
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            Agregar mi primera deuda
          </button>
        </div>
      ) : (
        <>
          {/* Resumen + Estrategia */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="stat-card p-5">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total adeudado</div>
              <div className="text-2xl font-bold text-red-400"><MaskedAmount amount={totalDebt} /></div>
            </div>
            <div className="stat-card p-5">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Mínimos / mes</div>
              <div className="text-2xl font-bold text-white"><MaskedAmount amount={totalMinimums} /></div>
            </div>
            <div className="stat-card p-5">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Libre de deudas en</div>
              <div className="text-2xl font-bold text-emerald-400">
                {totalMonths > 0 ? `${totalMonths} meses` : "—"}
              </div>
              {totalMonths > 0 && <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>{(totalMonths / 12).toFixed(1)} años</div>}
            </div>
          </div>

          {/* Controles de estrategia */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: "#94A3B8" }}>Estrategia</div>
                <div className="flex gap-2">
                  {([
                    { key: "snowball",  label: "Bola de Nieve", icon: <Snowflake size={14} />, desc: "Menor saldo primero" },
                    { key: "avalanche", label: "Avalancha",     icon: <Flame size={14} />,    desc: "Mayor tasa primero" },
                  ] as const).map(({ key, label, icon, desc }) => (
                    <button key={key} onClick={() => setStrategy(key)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: strategy === key ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                        color: strategy === key ? "#F87171" : "#64748B",
                        border: strategy === key ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      }}>
                      {icon} {label}
                      <span className="hidden sm:inline" style={{ color: "#64748B", fontWeight: 400 }}>· {desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-40">
                <div className="text-xs font-medium mb-2" style={{ color: "#94A3B8" }}>Pago extra mensual</div>
                <input type="number" min="0" step="100" className="input-dark text-sm"
                  placeholder="$0.00" value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)} />
              </div>
              {totalInterest > 0 && (
                <div className="text-right">
                  <div className="text-xs" style={{ color: "#64748B" }}>Total en intereses</div>
                  <div className="text-lg font-bold text-red-400"><MaskedAmount amount={totalInterest} /></div>
                </div>
              )}
            </div>

            {/* Gráfico de línea de tiempo */}
            {chartData.length > 0 && (
              <>
                <div className="text-xs font-medium mb-3" style={{ color: "#64748B" }}>
                  Meses hasta liquidar cada deuda
                </div>
                <ResponsiveContainer width="100%" height={Math.max(100, chartData.length * 44)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }}
                      axisLine={false} tickLine={false} width={110} />
                    <Tooltip formatter={(v) => [`${v} meses (${(Number(v) / 12).toFixed(1)} años)`, "Tiempo"]}
                      contentStyle={{ background: "var(--bg-secondary)", border: "1px solid rgba(239,68,68,0.2)" }} />
                    <Bar dataKey="months" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                    {totalMonths > 0 && (
                      <ReferenceLine x={totalMonths} stroke="#10B981" strokeDasharray="4 2"
                        label={{ value: "Libre", position: "right", fill: "#10B981", fontSize: 11 }} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Cards de deudas */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#94A3B8" }}>
              Orden de ataque ({strategy === "snowball" ? "menor saldo primero" : "mayor tasa primero"})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {results.map((debt, idx) => {
                const dt = DEBT_TYPES.find((t) => t.value === debt.type) ?? DEBT_TYPES[5]
                const isTarget = idx === 0
                const progressPct = debt.originalBalance > 0
                  ? Math.min(100, ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100)
                  : 0
                return (
                  <div key={debt.id}
                    onClick={() => router.push(`/deudas/${debt.id}`)}
                    className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                    style={{
                      background: isTarget ? `${debt.color}10` : "var(--bg-tertiary)",
                      border: `1px solid ${isTarget ? debt.color + "35" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                          style={{ background: debt.color + "18" }}>
                          {dt.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm flex items-center gap-2">
                            {debt.name}
                            {isTarget && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                style={{ background: debt.color + "20", color: debt.color }}>
                                OBJETIVO
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                            {formatPercent(debt.interestRate)} anual · mín. <MaskedAmount amount={debt.minimumPayment} />/mes
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-bold text-white"><MaskedAmount amount={debt.balance} /></div>
                          {debt.paidOffMonth && (
                            <div className="text-xs text-emerald-400">mes {debt.paidOffMonth}</div>
                          )}
                        </div>
                        <button onClick={(e) => handleDelete(debt.id, e)}
                          className="p-1.5 rounded-lg btn-danger opacity-60 hover:opacity-100">
                          <Trash2 size={12} />
                        </button>
                        <ChevronRight size={14} style={{ color: "#475569" }} />
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="mt-3 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${progressPct}%`, background: debt.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
