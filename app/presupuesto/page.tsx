"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart3, Flame, DollarSign } from "lucide-react"
import { formatCurrency, formatPercent, BUDGET_METHODS, calculateFIRENumber, calculateYearsToFIRE } from "@/lib/utils"

type MethodKey = keyof typeof BUDGET_METHODS

export default function PresupuestoPage() {
  const [income, setIncome] = useState("")
  const [method, setMethod] = useState<MethodKey>("50-30-20")
  const [monthlyExpenses, setMonthlyExpenses] = useState("")
  const [currentSavings, setCurrentSavings] = useState("")
  const [monthlySavings, setMonthlySavings] = useState("")

  const incomeNum = parseFloat(income) || 0
  const expensesNum = parseFloat(monthlyExpenses) || 0
  const savingsNum = parseFloat(currentSavings) || 0
  const mSavingsNum = parseFloat(monthlySavings) || 0

  const selectedMethod = BUDGET_METHODS[method]
  const fireNumber = calculateFIRENumber(expensesNum)
  const yearsToFire = calculateYearsToFIRE(savingsNum, mSavingsNum, expensesNum)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 style={{ color: "#F59E0B" }} /> Recomendación de Presupuesto
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">Elige el método y obtén tu plan personalizado</p>
      </div>

      {/* Income Input */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <label className="text-sm font-semibold text-white block mb-3">Tu ingreso mensual neto</label>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <DollarSign size={16} className="absolute left-3 top-3" style={{ color: "#10B981" }} />
            <input
              type="number" step="0.01" min="0"
              className="input-dark pl-8"
              placeholder="Ej: 15000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Method Selector */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Selecciona tu método</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {(Object.keys(BUDGET_METHODS) as MethodKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: method === key ? "rgba(245,158,11,0.15)" : "rgba(6,13,31,0.5)",
                border: method === key ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-xs font-bold mb-1" style={{ color: method === key ? "#F59E0B" : "#94A3B8" }}>
                {BUDGET_METHODS[key].name}
              </div>
              <div className="text-xs leading-relaxed line-clamp-2" style={{ color: "#64748B" }}>
                {BUDGET_METHODS[key].categories.map((c) => `${c.percent}%`).join(" · ")}
              </div>
            </button>
          ))}
        </div>

        {/* Method description */}
        <div className="p-4 rounded-xl mb-6" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="font-semibold text-white mb-1">{selectedMethod.name}</div>
          <p className="text-sm" style={{ color: "#94A3B8" }}>{selectedMethod.description}</p>
        </div>

        {/* Budget Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Cards */}
          <div className="space-y-3">
            {selectedMethod.categories.map((cat) => {
              const amount = incomeNum * (cat.percent / 100)
              return (
                <div key={cat.name} className="p-4 rounded-xl" style={{ background: "rgba(6,13,31,0.6)", border: `1px solid ${cat.color}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <div className="font-semibold text-white text-sm">{cat.name}</div>
                        <div className="text-xs" style={{ color: "#64748B" }}>{cat.examples}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: cat.color }}>
                        {cat.percent}%
                      </div>
                      {incomeNum > 0 && (
                        <div className="text-sm font-medium text-white">{formatCurrency(amount)}</div>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cat.percent}%`, background: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pie Chart */}
          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={selectedMethod.categories}
                  cx="50%" cy="50%"
                  innerRadius={65} outerRadius={100}
                  paddingAngle={3}
                  dataKey="percent"
                  nameKey="name"
                >
                  {selectedMethod.categories.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
              {selectedMethod.categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span style={{ color: "#94A3B8" }}>{cat.name} ({cat.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FIRE Calculator */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Flame size={20} style={{ color: "#EF4444" }} />
          <h2 className="text-lg font-semibold text-white">Calculadora FIRE</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}>
            Financial Independence
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
              Gastos mensuales actuales
            </label>
            <input type="number" className="input-dark" placeholder="Ej: 8000"
              value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
              Ahorros / inversiones actuales
            </label>
            <input type="number" className="input-dark" placeholder="Ej: 50000"
              value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
              Ahorro mensual actual
            </label>
            <input type="number" className="input-dark" placeholder="Ej: 3000"
              value={monthlySavings} onChange={(e) => setMonthlySavings(e.target.value)} />
          </div>
        </div>

        {expensesNum > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>Número FIRE</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(fireNumber)}</div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>25× tus gastos anuales</div>
            </div>
            <div className="p-5 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>Gastos anuales</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(expensesNum * 12)}</div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Para mantener tu estilo de vida</div>
            </div>
            {savingsNum > 0 && (
              <div className="p-5 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>Progreso FIRE</div>
                <div className="text-2xl font-bold text-white">
                  {formatPercent((savingsNum / fireNumber) * 100)}
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (savingsNum / fireNumber) * 100)}%`,
                    background: "linear-gradient(90deg, #4F46E5, #6366F1)"
                  }} />
                </div>
              </div>
            )}
            {mSavingsNum > 0 && (
              <div className="p-5 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>Años para FIRE</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {yearsToFire > 100 ? "100+" : yearsToFire}
                </div>
                <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Con 7% de retorno anual</div>
              </div>
            )}
          </div>
        )}

        {expensesNum === 0 && (
          <div className="text-center py-6" style={{ color: "#475569" }}>
            Ingresa tus gastos mensuales para calcular tu número FIRE
          </div>
        )}

        <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: "rgba(6,13,31,0.5)", color: "#94A3B8" }}>
          <strong className="text-white">¿Qué es el Número FIRE?</strong> Es la cantidad que necesitas tener invertida
          para vivir de las ganancias sin trabajar. Se calcula como 25 veces tus gastos anuales, basado en la
          <em> Regla del 4%</em>: puedes retirar el 4% de tu portafolio anualmente de forma sustentable.
        </div>
      </div>
    </div>
  )
}
