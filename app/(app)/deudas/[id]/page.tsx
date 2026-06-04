"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, AlertTriangle, TrendingDown } from "lucide-react"
import { formatPercent } from "@/lib/utils"
import AmortizationTable from "@/components/AmortizationTable"
import MaskedAmount from "@/components/ui/MaskedAmount"

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

const DEBT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  credit:   { label: "Tarjeta de Crédito", icon: "💳" },
  personal: { label: "Préstamo Personal",  icon: "👤" },
  auto:     { label: "Crédito Automotriz", icon: "🚗" },
  mortgage: { label: "Hipoteca",           icon: "🏠" },
  student:  { label: "Crédito Educativo",  icon: "🎓" },
  other:    { label: "Otro",               icon: "📄" },
}

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [debt, setDebt] = useState<Debt | null>(null)
  const [loading, setLoading] = useState(true)
  const [extraPayment, setExtraPayment] = useState("0")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/debts")
      .then((r) => r.json())
      .then((debts: Debt[]) => {
        const found = debts.find((d) => d.id === id)
        setDebt(found ?? null)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Registrar un abono: reduce el saldo de la deuda en la base de datos.
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const payment = parseFloat(paymentAmount)
    if (!payment || payment <= 0) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment }),
      })
      if (res.ok) {
        const updated: Debt = await res.json()
        setDebt(updated)
        setPaymentAmount("")
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
        <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: "#6366F1" }}>
          Volver
        </button>
      </div>
    )
  }

  const r = debt.interestRate / 100 / 12
  const n = debt.termMonths ?? 0
  // La cuota base se calcula sobre el capital ORIGINAL del préstamo, no el saldo
  // actual, para que refleje la cuota real del banco aunque ya se haya amortizado.
  const originalPrincipal = debt.originalBalance

  // Cuota base (fórmula francesa)
  const basePayment = n > 0
    ? (r === 0
        ? originalPrincipal / n
        : (originalPrincipal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : debt.minimumPayment

  const lifeIns = debt.lifeInsurance ?? 0
  const debtIns = debt.debtInsurance ?? 0
  const totalInsurance = lifeIns + debtIns

  // Validación: seguro ilógico (>20% de la cuota base)
  const insurancePct = basePayment > 0 ? (totalInsurance / basePayment) * 100 : 0
  const insuranceWarning = insurancePct > 20

  const extra = parseFloat(extraPayment) || 0
  const totalMonthly = basePayment + totalInsurance + extra

  const progressPct = debt.originalBalance > 0
    ? Math.min(100, ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100)
    : 0

  const typeInfo = DEBT_TYPE_LABELS[debt.type] ?? DEBT_TYPE_LABELS.other

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: "#6366F1" }}>
        <ArrowLeft size={16} /> Volver a Deudas
      </button>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {typeInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{debt.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                {typeInfo.label}
                {debt.isMixedRate && <span className="ml-2 px-1.5 py-0.5 text-xs rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Tasa mixta</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-red-400"><MaskedAmount amount={debt.balance} /></div>
            <div className="text-xs mt-1" style={{ color: "#64748B" }}>
              de <MaskedAmount amount={debt.originalBalance} /> original
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#64748B" }}>
            <span>Pagado: {progressPct.toFixed(1)}%</span>
            <span><MaskedAmount amount={debt.originalBalance - debt.balance} /> abonado</span>
          </div>
          <div className="h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-2.5 rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#10B981,#059669)" }} />
          </div>
        </div>

        {/* Info rápida */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div className="text-xs" style={{ color: "#64748B" }}>Tasa anual</div>
            <div className="text-lg font-bold text-white mt-0.5">{formatPercent(debt.interestRate)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "#64748B" }}>Pago mínimo</div>
            <div className="text-lg font-bold text-white mt-0.5"><MaskedAmount amount={debt.minimumPayment} /></div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "#64748B" }}>Plazo</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {debt.termMonths ? `${debt.termMonths} meses` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Registrar abono */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <TrendingDown size={16} style={{ color: "#10B981" }} /> Registrar Abono
        </h2>
        <p className="text-xs mb-4" style={{ color: "#64748B" }}>
          Registra un pago real a esta deuda. El saldo se reducirá automáticamente.
        </p>
        <form onSubmit={handlePayment} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
              Monto del abono
            </label>
            <input
              type="number" min="0" step="0.01" required className="input-dark"
              placeholder="$0.00" value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <button type="submit" disabled={submitting || debt.balance <= 0}
            className="py-2.5 px-6 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#059669,#10B981)" }}>
            {submitting ? "Registrando..." : "Registrar Abono"}
          </button>
        </form>
        {debt.balance <= 0 && (
          <p className="text-xs mt-3" style={{ color: "#10B981" }}>
            ✓ Esta deuda ya está liquidada.
          </p>
        )}
      </div>

      {/* Desglose mensual */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingDown size={16} style={{ color: "#EF4444" }} /> Desglose de Pago Mensual
        </h2>

        <div className="space-y-3 mb-5">
          {[
            { label: "Cuota base (amortización)", value: basePayment, color: "#F1F5F9" },
            { label: `Seguro de vida`, value: lifeIns, color: "#F59E0B", hidden: lifeIns === 0 },
            { label: `Seguro de daños`, value: debtIns, color: "#F59E0B", hidden: debtIns === 0 },
            { label: "Pago extra", value: extra, color: "#10B981", hidden: extra === 0 },
          ].filter((r) => !r.hidden).map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span style={{ color: "#94A3B8" }}>{label}</span>
              <span className="font-semibold" style={{ color }}><MaskedAmount amount={value} /></span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-3 text-base font-bold"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-white">Total mensual</span>
            <span style={{ color: "#818CF8" }}><MaskedAmount amount={totalMonthly} /></span>
          </div>
        </div>

        {/* Advertencia de seguro */}
        {insuranceWarning && (
          <div className="flex gap-3 p-3 rounded-xl text-xs"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertTriangle size={15} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
            <div style={{ color: "#D97706" }}>
              <strong>Seguro elevado:</strong> Los seguros ({formatPercent(insurancePct)} de la cuota) parecen
              altos para este préstamo. Verifica los montos con tu institución financiera.
            </div>
          </div>
        )}

        {/* Pago extra */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
            Simular pago extra mensual
          </label>
          <input
            type="number" min="0" step="100" className="input-dark"
            placeholder="$0.00" value={extraPayment}
            onChange={(e) => setExtraPayment(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>
            Ingresa un monto extra para ver cómo acelera la liquidación en la tabla de abajo.
          </p>
        </div>
      </div>

      {/* Tabla de amortización */}
      {debt.termMonths && debt.termMonths > 0 ? (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <CreditCard size={16} style={{ color: "#6366F1" }} /> Tabla de Amortización
          </h2>
          <p className="text-xs mb-5" style={{ color: "#64748B" }}>
            Verde = capital abonado · Rojo = intereses · Amarillo = seguros
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
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center" style={{ color: "#64748B" }}>
          <p className="text-sm">Sin plazo definido para esta deuda.</p>
          <p className="text-xs mt-1">Edita la deuda desde la sección principal y agrega el plazo en meses para ver la tabla de amortización.</p>
        </div>
      )}
    </div>
  )
}
