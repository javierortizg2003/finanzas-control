"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { PiggyBank, Plus, Trash2, Edit3, Check, X } from "lucide-react"
import { formatCurrency, formatPercent, SAVING_TYPES, CATEGORY_COLORS } from "@/lib/utils"

interface Saving {
  id: string; name: string; institution: string | null
  amount: number; type: string; interestRate: number; color: string
}

const COLORS = [
  "#10B981", "#6366F1", "#F59E0B", "#EC4899", "#14B8A6",
  "#8B5CF6", "#EF4444", "#F97316", "#22C55E", "#0EA5E9",
]

export default function AhorrosPage() {
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", institution: "", amount: "",
    type: SAVING_TYPES[0], interestRate: "0",
    color: COLORS[0],
  })
  const [editForm, setEditForm] = useState<typeof form | null>(null)

  const fetchData = () => {
    fetch("/api/savings")
      .then((r) => r.json())
      .then(setSavings)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) < 0) return
    setSubmitting(true)
    try {
      await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, color: COLORS[savings.length % COLORS.length] }),
      })
      setForm({ name: "", institution: "", amount: "", type: SAVING_TYPES[0], interestRate: "0", color: COLORS[0] })
      fetchData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm) return
    await fetch(`/api/savings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditing(null)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta de ahorro?")) return
    await fetch(`/api/savings/${id}`, { method: "DELETE" })
    setSavings((prev) => prev.filter((s) => s.id !== id))
  }

  const totalSavings = savings.reduce((s, sv) => s + sv.amount, 0)
  const avgInterest = savings.length > 0
    ? savings.reduce((s, sv) => s + sv.interestRate, 0) / savings.length : 0

  // Projected value in 1 year with compound interest
  const projectedTotal = savings.reduce((sum, sv) => {
    const monthly = sv.interestRate / 100 / 12
    return sum + sv.amount * Math.pow(1 + monthly, 12)
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <PiggyBank style={{ color: "#6366F1" }} /> Mis Ahorros
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">Gestiona tus cuentas y proyecta tu crecimiento</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total ahorrado</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalSavings)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Cuentas activas</div>
          <div className="text-2xl font-bold text-white">{savings.length}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Interés promedio</div>
          <div className="text-2xl font-bold text-emerald-400">{formatPercent(avgInterest)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Proyección 1 año</div>
          <div className="text-2xl font-bold text-indigo-400">{formatCurrency(projectedTotal)}</div>
          <div className="text-xs mt-1" style={{ color: "#10B981" }}>
            +{formatCurrency(projectedTotal - totalSavings)}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Plus size={18} style={{ color: "#6366F1" }} /> Agregar Cuenta
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Nombre *</label>
              <input type="text" required className="input-dark" placeholder="Ej: CETES Directo"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Institución</label>
              <input type="text" className="input-dark" placeholder="Ej: BBVA, Fintual..."
                value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Saldo actual *</label>
              <input type="number" step="0.01" min="0" required className="input-dark" placeholder="$0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Tipo</label>
              <select className="input-dark" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {SAVING_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Tasa de interés anual (%)
              </label>
              <input type="number" step="0.01" min="0" max="100" className="input-dark" placeholder="0.00"
                value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)" }}>
              {submitting ? "Guardando..." : "Agregar Cuenta"}
            </button>
          </form>
        </div>

        {/* Pie Chart */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Distribución</h2>
          {savings.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={savings} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    paddingAngle={3} dataKey="amount" nameKey="name">
                    {savings.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2 mb-4">
                <div className="text-2xl font-bold text-white">{formatCurrency(totalSavings)}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>Total</div>
              </div>
              <div className="space-y-2">
                {savings.map((sv, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: sv.color }} />
                      <span style={{ color: "#94A3B8" }} className="truncate max-w-28">{sv.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{formatCurrency(sv.amount)}</div>
                      <div style={{ color: "#64748B" }}>{((sv.amount / totalSavings) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#475569" }}>
              Agrega tu primera cuenta de ahorro
            </div>
          )}
        </div>

        {/* Interest Projection */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Proyección de Intereses</h2>
          <div className="space-y-3">
            {[1, 3, 5, 10].map((years) => {
              const projected = savings.reduce((sum, sv) => {
                const monthly = sv.interestRate / 100 / 12
                return sum + sv.amount * Math.pow(1 + monthly, years * 12)
              }, 0)
              const gained = projected - totalSavings
              return (
                <div key={years} className="p-4 rounded-xl" style={{ background: "rgba(6,13,31,0.5)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-semibold text-white">{years} {years === 1 ? "año" : "años"}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>Con interés compuesto</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{formatCurrency(projected)}</div>
                      <div className="text-xs text-emerald-400">+{formatCurrency(gained)}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (gained / Math.max(1, totalSavings)) * 100 * 5)}%`,
                        background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Savings List */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Mis Cuentas</h2>
        {savings.length === 0 ? (
          <div className="text-center py-10" style={{ color: "#475569" }}>
            No tienes cuentas de ahorro registradas.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savings.map((sv) => (
              <div key={sv.id} className="p-4 rounded-xl" style={{ background: "rgba(6,13,31,0.5)", border: `1px solid ${sv.color}25` }}>
                {editing === sv.id && editForm ? (
                  <div className="space-y-2">
                    <input className="input-dark text-sm" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <input type="number" className="input-dark text-sm" value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                    <input type="number" className="input-dark text-sm" placeholder="Tasa de interés %"
                      value={editForm.interestRate}
                      onChange={(e) => setEditForm({ ...editForm, interestRate: e.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(sv.id)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                        style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                        <Check size={12} /> Guardar
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}>
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-white">{sv.name}</div>
                        {sv.institution && <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{sv.institution}</div>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${sv.color}20`, color: sv.color }}>
                        {sv.type}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{formatCurrency(sv.amount)}</div>
                    {sv.interestRate > 0 && (
                      <div className="text-xs text-emerald-400">{formatPercent(sv.interestRate)} anual</div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => {
                        setEditing(sv.id)
                        setEditForm({ name: sv.name, institution: sv.institution || "", amount: String(sv.amount), type: sv.type, interestRate: String(sv.interestRate), color: sv.color })
                      }} className="p-1.5 rounded-lg transition-colors" style={{ color: "#6366F1", background: "rgba(99,102,241,0.1)" }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(sv.id)} className="btn-danger p-1.5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
