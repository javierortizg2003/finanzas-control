"use client"

import { useMemo, useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  principal: number          // saldo actual — punto de partida de la proyección
  annualRate: number
  months: number
  lifeIns?: number
  debtIns?: number
  extraPayment?: number
  originalPrincipal?: number // capital inicial del préstamo — base de la cuota
}

interface Row {
  month: number
  payment: number
  principalPaid: number
  interest: number
  insurance: number
  totalPayment: number
  balance: number
}

function buildSchedule(
  principal: number,
  annualRate: number,
  months: number,
  lifeIns: number,
  debtIns: number,
  extraPayment: number,
  originalPrincipal: number
): Row[] {
  if (principal <= 0 || months <= 0) return []

  const r = annualRate / 100 / 12
  // Fórmula francesa: P * (r*(1+r)^n) / ((1+r)^n - 1)
  // 0% → pagos iguales de capital
  // La cuota base se calcula sobre el CAPITAL ORIGINAL del préstamo (no el saldo
  // actual): así coincide con la cuota real del banco aunque ya se haya amortizado.
  const basePayment =
    r === 0
      ? originalPrincipal / months
      : (originalPrincipal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)

  const monthlyInsurance = (lifeIns ?? 0) + (debtIns ?? 0)
  const totalMonthly = basePayment + extraPayment

  // Validación: seguro no puede exceder el 20% del pago base
  const insurancePct = basePayment > 0 ? (monthlyInsurance / basePayment) * 100 : 0
  const effectiveInsurance = insurancePct > 20 ? basePayment * 0.2 : monthlyInsurance

  let balance = principal
  const rows: Row[] = []

  for (let i = 1; i <= months; i++) {
    if (balance <= 0.01) break // ← se detiene cuando saldo llega a cero

    const interest = balance * r
    // Capital disponible en este pago (cuota + extra - interés)
    const availableForPrincipal = totalMonthly - interest
    // Si el disponible supera el saldo, liquida en esta misma fila
    const principalPaid = Math.min(balance, Math.max(0, availableForPrincipal))
    const actualPayment = interest + principalPaid // puede ser menor en último mes
    balance = Math.max(0, balance - principalPaid)

    rows.push({
      month: i,
      payment: actualPayment,
      principalPaid,
      interest,
      insurance: effectiveInsurance,
      totalPayment: actualPayment + effectiveInsurance,
      balance,
    })

    if (balance <= 0.01) break // liquidada → no más filas
  }

  return rows
}

export default function AmortizationTable({
  principal,
  annualRate,
  months,
  lifeIns = 0,
  debtIns = 0,
  extraPayment = 0,
  originalPrincipal,
}: Props) {
  const [showFull, setShowFull] = useState(false)

  const rows = useMemo(
    () => buildSchedule(principal, annualRate, months, lifeIns, debtIns, extraPayment, originalPrincipal ?? principal),
    [principal, annualRate, months, lifeIns, debtIns, extraPayment, originalPrincipal]
  )

  if (rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#64748B" }}>
        Sin datos suficientes para calcular la amortización.
      </p>
    )
  }

  const totalInterest = rows.reduce((s, r) => s + r.interest, 0)
  const totalInsurance = rows.reduce((s, r) => s + r.insurance, 0)
  const totalPaid = rows.reduce((s, r) => s + r.totalPayment, 0)
  const actualMonths = rows.length
  const displayRows = showFull ? rows : rows.slice(0, 12)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cuota base",       value: formatCurrency(rows[0].payment),  color: "#F1F5F9" },
          { label: "Total intereses",  value: formatCurrency(totalInterest),     color: "#EF4444" },
          { label: "Total seguros",    value: formatCurrency(totalInsurance),    color: "#F59E0B" },
          { label: "Costo total",      value: formatCurrency(totalPaid),         color: "#818CF8" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl text-center"
            style={{ background: "var(--bg-hover)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-xs mb-1" style={{ color: "#64748B" }}>{label}</div>
            <div className="text-base font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {actualMonths < months && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
          Con pagos extra, liquidas en <strong>{actualMonths} meses</strong> en lugar de {months} — ahorras {months - actualMonths} meses de intereses.
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: "var(--bg-secondary)" }}>
            <tr>
              {["Mes", "Cuota", "Capital", "Interés", "Seguros", "Total", "Saldo"].map((h) => (
                <th key={h}
                  className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: "#64748B", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={row.month}
                className="transition-colors hover:bg-white/5"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  background: i % 2 === 0 ? "var(--bg-hover)" : "transparent",
                }}>
                <td className="px-3 py-2 font-medium" style={{ color: "#94A3B8" }}>{row.month}</td>
                <td className="px-3 py-2 text-white">{formatCurrency(row.payment)}</td>
                <td className="px-3 py-2 font-medium" style={{ color: "#10B981" }}>{formatCurrency(row.principalPaid)}</td>
                <td className="px-3 py-2 font-medium" style={{ color: "#EF4444" }}>{formatCurrency(row.interest)}</td>
                <td className="px-3 py-2" style={{ color: row.insurance > 0 ? "#F59E0B" : "#475569" }}>
                  {row.insurance > 0 ? formatCurrency(row.insurance) : "—"}
                </td>
                <td className="px-3 py-2 font-semibold" style={{ color: "#818CF8" }}>{formatCurrency(row.totalPayment)}</td>
                <td className="px-3 py-2" style={{ color: row.balance < 1 ? "#10B981" : "#64748B" }}>
                  {row.balance < 1 ? "✓ Liquidado" : formatCurrency(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 12 && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="flex items-center gap-1.5 text-xs font-medium mx-auto px-4 py-2 rounded-lg transition-all"
          style={{ color: "#6366F1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
          {showFull ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showFull ? "Mostrar solo primer año" : `Ver los ${rows.length} pagos completos`}
        </button>
      )}
    </div>
  )
}
