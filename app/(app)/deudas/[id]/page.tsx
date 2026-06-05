"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, TrendingDown, AlertTriangle, Calendar, CreditCard as CreditCardIcon } from "lucide-react"
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"
import AmortizationTable from "@/components/AmortizationTable"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts"

interface Debt {
  id: string
  name: string
  balance: number
  originalBalance: number
  interestRate: number
  minimumPayment: number
  type: string
  termMonths: number | null
  lifeInsurance: number | null
  debtInsurance: number | null
  isMixedRate: boolean
}

interface Wallet {
  id: string
  name: string
  balance: number
  currency: string
  type: string
  color: string
}

interface DebtPayment {
  id: string
  amount: number
  capital: number
  interest: number
  insurance: number
  balanceAfter: number
  date: string
  note: string | null
}

const DEBT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  credit:   { label: "Tarjeta de Crédito", icon: "💳" },
  personal: { label: "Préstamo Personal",  icon: "👤" },
  auto:     { label: "Crédito Automotriz", icon: "🚗" },
  mortgage: { label: "Hipoteca",           icon: "🏠" },
  student:  { label: "Crédito Educativo",  icon: "🎓" },
  other:    { label: "Otro",               icon: "📄" },
}

function buildSchedule(debt: Debt, extra: number) {
  const { balance, originalBalance, interestRate, termMonths, lifeInsurance, debtInsurance } = debt
  if (!termMonths || termMonths <= 0 || balance <= 0) return []
  const r = interestRate / 100 / 12
  const basePayment = r === 0
    ? originalBalance / termMonths
    : (originalBalance * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1)
  const insurance = (lifeInsurance ?? 0) + (debtInsurance ?? 0)
  let bal = balance
  const rows = []
  for (let i = 1; i <= termMonths; i++) {
    if (bal <= 0.01) break
    const interest = bal * r
    const principalPaid = Math.min(bal, Math.max(0, basePayment + extra - interest))
    bal = Math.max(0, bal - principalPaid)
    rows.push({ month: i, principalPaid, interest, insurance, balance: bal })
  }
  return rows
}

// Tooltip personalizado para el donut
function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p style={{ color: payload[0].payload.color }} className="font-semibold">{payload[0].name}</p>
      <p className="text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [debt, setDebt]         = useState<Debt | null>(null)
  const [payments, setPayments] = useState<DebtPayment[]>([])
  const [wallets, setWallets]   = useState<Wallet[]>([])
  const [loading, setLoading]   = useState(true)
  const [extraPayment, setExtraPayment] = useState("0")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentNote, setPaymentNote] = useState("")
  const [paymentWalletId, setPaymentWalletId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showTable, setShowTable] = useState(false)

  const load = useCallback(async () => {
    const [debtsRes, paymentsRes, walletsRes] = await Promise.all([
      fetch("/api/debts"),
      fetch(`/api/debts/${id}/payments`),
      fetch("/api/wallets"),
    ])
    const debts: Debt[] = await debtsRes.json()
    const found = debts.find((d) => d.id === id) ?? null
    setDebt(found)
    if (paymentsRes.ok) setPayments(await paymentsRes.json())
    if (walletsRes.ok) {
      const ws: Wallet[] = await walletsRes.json()
      setWallets(ws.filter(w => w.type !== "CREDIT_CARD"))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const payment = parseFloat(paymentAmount)
    if (!payment || payment <= 0) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment,
          date:     paymentDate,
          note:     paymentNote     || null,
          walletId: paymentWalletId || null,
        }),
      })
      if (res.ok) {
        setPaymentAmount("")
        setPaymentNote("")
        load()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!debt) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: "#EF4444" }}>Deuda no encontrada.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: "#6366F1" }}>Volver</button>
      </div>
    )
  }

  const r            = debt.interestRate / 100 / 12
  const n            = debt.termMonths ?? 0
  const lifeIns      = debt.lifeInsurance  ?? 0
  const debtIns      = debt.debtInsurance  ?? 0
  const totalIns     = lifeIns + debtIns
  const basePayment  = n > 0
    ? (r === 0 ? debt.originalBalance / n : (debt.originalBalance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : debt.minimumPayment
  const extra        = parseFloat(extraPayment) || 0
  const totalMonthly = basePayment + totalIns + extra

  // Desglose real del mes actual basado en el saldo vigente
  const currentInterest  = debt.balance * r
  const currentCapital   = Math.max(0, totalMonthly - currentInterest - totalIns)
  const currentInsurance = totalIns

  const paidSoFar  = debt.originalBalance - debt.balance
  const progressPct = debt.originalBalance > 0 ? Math.min(100, (paidSoFar / debt.originalBalance) * 100) : 0
  const typeInfo   = DEBT_TYPE_LABELS[debt.type] ?? DEBT_TYPE_LABELS.other

  // Proyección total de costos
  const schedule    = buildSchedule(debt, extra)
  const projInterest  = schedule.reduce((s, r) => s + r.interest, 0)
  const projInsurance = schedule.reduce((s, r) => s + r.insurance, 0)
  const insWarning  = basePayment > 0 && (totalIns / basePayment) * 100 > 20

  // Donut: distribución del costo total restante
  const donutData = [
    { name: "Capital",    value: debt.balance,    color: "#10B981" },
    { name: "Intereses",  value: projInterest,    color: "#EF4444" },
    { name: "Seguros",    value: projInsurance,   color: "#F59E0B" },
  ].filter(d => d.value > 0)

  // Gráfica de saldo real (solo pagos registrados)
  const balanceChartData = payments.length > 0
    ? [
        { label: "Inicio", balance: debt.originalBalance, date: "" },
        ...payments.map((p) => ({
          label: new Date(p.date).toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
          balance: p.balanceAfter,
          date: p.date,
        })),
      ]
    : []

  const monthsLeft = schedule.length
  const monthsSaved = n > 0 && extra > 0 ? n - monthsLeft : 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
        style={{ color: "#6366F1" }}>
        <ArrowLeft size={16} /> Volver a Deudas
      </button>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {typeInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{debt.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                {typeInfo.label}
                {debt.isMixedRate && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs rounded"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Tasa mixta</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs mb-0.5" style={{ color: "#64748B" }}>Saldo actual</div>
            <div className="text-4xl font-bold text-red-400"><MaskedAmount amount={debt.balance} /></div>
            <div className="text-xs mt-1" style={{ color: "#475569" }}>
              de <MaskedAmount amount={debt.originalBalance} /> original
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: "#10B981" }}>{progressPct.toFixed(1)}% pagado</span>
            <span style={{ color: "#64748B" }}><MaskedAmount amount={paidSoFar} /> abonado</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#10B981,#059669)" }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { label: "Tasa anual",     value: formatPercent(debt.interestRate), color: "#EF4444" },
            { label: "Pago mensual",   value: formatCurrency(totalMonthly),     color: "#818CF8" },
            { label: "Plazo",          value: n > 0 ? `${n} meses` : "—",       color: "#F1F5F9" },
            { label: "Meses restantes",value: monthsLeft > 0 ? `${monthsLeft}` : "—", color: "#F59E0B" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-xs" style={{ color: "#64748B" }}>{label}</div>
              <div className="text-lg font-bold mt-0.5" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Costo total + Gráfica de saldo ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Donut: distribución del costo restante */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Costo total restante</h2>
          <p className="text-xs mb-4" style={{ color: "#64748B" }}>Distribución proyectada de lo que aún pagarás</p>

          {donutData.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      dataKey="value" paddingAngle={3}>
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {donutData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span style={{ color: "#94A3B8" }}>{name}</span>
                    </div>
                    <span className="font-semibold" style={{ color }}>{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="font-semibold text-white">Total</span>
                  <span className="font-bold text-white">{formatCurrency(donutData.reduce((s, d) => s + d.value, 0))}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "#64748B" }}>Sin plazo definido para proyectar.</p>
          )}
        </div>

        {/* Gráfica de saldo real */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Evolución del saldo</h2>
          <p className="text-xs mb-4" style={{ color: "#64748B" }}>Solo con tus abonos reales registrados</p>

          {balanceChartData.length > 1 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [formatCurrency(Number(v)), "Saldo"]}
                    labelStyle={{ color: "#94A3B8" }}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#EF4444" strokeWidth={2}
                    fill="url(#balGrad)" dot={{ fill: "#EF4444", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-center">
              <div className="text-4xl mb-3">📉</div>
              <p className="text-sm font-medium text-white mb-1">Sin abonos registrados aún</p>
              <p className="text-xs" style={{ color: "#64748B" }}>La gráfica aparecerá cuando registres tu primer pago.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Desglose mensual ─────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingDown size={15} style={{ color: "#EF4444" }} /> Desglose del pago mensual
        </h2>

        {/* Barra apilada visual — basada en saldo vigente */}
        {basePayment > 0 && (
          <div className="mb-5">
            <div className="flex h-5 rounded-full overflow-hidden mb-3 gap-0.5">
              {[
                { value: currentCapital,   color: "#10B981" },
                { value: currentInterest,  color: "#EF4444" },
                { value: currentInsurance, color: "#F59E0B" },
              ].filter(s => s.value > 0).map((seg, i) => (
                <div key={i} className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                  style={{ width: `${(seg.value / totalMonthly) * 100}%`, background: seg.color }} />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Capital",      value: currentCapital,               color: "#10B981", pct: currentCapital   / totalMonthly * 100 },
                { label: "Interés",      value: currentInterest,              color: "#EF4444", pct: currentInterest  / totalMonthly * 100 },
                { label: "Seg. vida",    value: lifeIns, color: "#F59E0B",    pct: lifeIns      / totalMonthly * 100, hidden: lifeIns  === 0 },
                { label: "Seg. daño",    value: debtIns, color: "#F59E0B",    pct: debtIns      / totalMonthly * 100, hidden: debtIns  === 0 },
                { label: "Pago extra",   value: extra,   color: "#6366F1",    pct: extra        / totalMonthly * 100, hidden: extra    === 0 },
              ].filter(s => !s.hidden).map(({ label, value, color, pct }) => (
                <div key={label} className="rounded-xl p-3"
                  style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs" style={{ color: "#64748B" }}>{label}</span>
                  </div>
                  <div className="text-sm font-bold" style={{ color }}>{formatCurrency(value)}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#475569" }}>{pct.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-3 rounded-xl px-4"
          style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)" }}>
          <span className="font-semibold text-white">Total mensual</span>
          <span className="text-xl font-bold" style={{ color: "#818CF8" }}><MaskedAmount amount={totalMonthly} /></span>
        </div>

        {insWarning && (
          <div className="flex gap-3 p-3 rounded-xl text-xs mt-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertTriangle size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />
            <span style={{ color: "#D97706" }}>
              Los seguros representan más del 20% de la cuota. Verifica los montos con tu banco.
            </span>
          </div>
        )}

        {/* Simulador de pago extra */}
        <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
            Simular pago extra mensual
          </label>
          <input type="number" min="0" step="100" className="input-dark"
            placeholder="$0.00" value={extraPayment}
            onChange={(e) => setExtraPayment(e.target.value)} />
          {monthsSaved > 0 && (
            <div className="mt-2 text-xs px-3 py-2 rounded-lg"
              style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
              Con ese extra, liquidarías <strong>{monthsLeft} meses</strong> antes — ahorras {monthsSaved} meses de intereses.
            </div>
          )}
        </div>
      </div>

      {/* ── Registrar abono ──────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <TrendingDown size={15} style={{ color: "#10B981" }} /> Registrar Abono
        </h2>
        <p className="text-xs mb-4" style={{ color: "#64748B" }}>El saldo se reduce y el desglose queda guardado en el historial.</p>

        <form onSubmit={handlePayment}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Monto del abono</label>
              <input type="number" min="0.01" step="0.01" required className="input-dark"
                placeholder="$0.00" value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha</label>
              <input type="date" className="input-dark" value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Cartera origen
              </label>
              <select required className="input-dark" value={paymentWalletId}
                onChange={(e) => setPaymentWalletId(e.target.value)}>
                <option value="">Seleccionar cartera...</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {formatCurrency(w.balance, w.currency)}
                  </option>
                ))}
              </select>
              {paymentWalletId && (() => {
                const w = wallets.find(w => w.id === paymentWalletId)
                const amt = parseFloat(paymentAmount) || 0
                if (!w || amt <= 0) return null
                const after = w.balance - amt
                return (
                  <p className="text-xs mt-1" style={{ color: after < 0 ? "#EF4444" : "#64748B" }}>
                    Saldo después: {formatCurrency(after, w.currency)}
                    {after < 0 && " — fondos insuficientes"}
                  </p>
                )
              })()}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Nota (opcional)</label>
              <input type="text" className="input-dark" placeholder="ej. Pago de mayo"
                value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={submitting || debt.balance <= 0}
            className="w-full py-2.5 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#059669,#10B981)" }}>
            {submitting ? "Registrando..." : "Registrar Abono"}
          </button>
          {debt.balance <= 0 && (
            <p className="text-xs mt-2 text-center" style={{ color: "#10B981" }}>✓ Esta deuda ya está liquidada.</p>
          )}
        </form>
      </div>

      {/* ── Historial de pagos ───────────────────────────────── */}
      {payments.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={15} style={{ color: "#6366F1" }} /> Historial de Abonos
          </h2>
          <div className="space-y-2">
            {[...payments].reverse().map((p) => (
              <div key={p.id} className="rounded-xl px-4 py-3"
                style={{ background: "var(--bg-hover)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold text-white">{formatCurrency(p.amount)}</span>
                    {p.note && <span className="ml-2 text-xs" style={{ color: "#64748B" }}>{p.note}</span>}
                  </div>
                  <span className="text-xs" style={{ color: "#64748B" }}>{formatDate(p.date)}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Capital",  value: p.capital,   color: "#10B981" },
                    { label: "Interés",  value: p.interest,  color: "#EF4444" },
                    { label: "Seguro",   value: p.insurance, color: "#F59E0B", hidden: p.insurance === 0 },
                  ].filter(s => !s.hidden).map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span style={{ color: "#475569" }}>{label}:</span>
                      <span className="font-medium" style={{ color }}>{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="ml-auto text-xs" style={{ color: "#475569" }}>
                    Saldo → <span className="font-medium text-white">{formatCurrency(p.balanceAfter)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabla de amortización ────────────────────────────── */}
      {debt.termMonths && debt.termMonths > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <button onClick={() => setShowTable(v => !v)}
            className="w-full flex items-center justify-between p-5 text-sm font-semibold text-white transition-colors hover:bg-white/5">
            <div className="flex items-center gap-2">
              <CreditCardIcon size={15} style={{ color: "#6366F1" }} />
              Tabla de Amortización proyectada
            </div>
            <span style={{ color: "#6366F1" }}>{showTable ? "Ocultar ▲" : "Ver tabla ▼"}</span>
          </button>
          {showTable && (
            <div className="px-6 pb-6">
              <p className="text-xs mb-4" style={{ color: "#64748B" }}>
                Verde = capital · Rojo = intereses · Amarillo = seguros
              </p>
              <AmortizationTable
                principal={debt.balance}
                originalPrincipal={debt.originalBalance}
                annualRate={debt.interestRate}
                months={debt.termMonths}
                lifeIns={lifeIns}
                debtIns={debtIns}
                extraPayment={extra}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
