"use client"

import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts"
import { TrendingDown, Plus, Trash2 } from "lucide-react"
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, CATEGORY_COLORS } from "@/lib/utils"

interface Transaction {
  id: string; type: string; amount: number; category: string
  description: string | null; date: string; createdAt: string
}

export default function GastosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filterCat, setFilterCat] = useState("Todos")
  const [form, setForm] = useState({
    amount: "", category: EXPENSE_CATEGORIES[0], description: "",
    date: new Date().toISOString().split("T")[0],
  })

  const fetchData = () => {
    fetch("/api/transactions?type=expense")
      .then((r) => r.json())
      .then(setTransactions)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return
    setSubmitting(true)
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "expense" }),
      })
      setForm({ amount: "", category: EXPENSE_CATEGORIES[0], description: "", date: new Date().toISOString().split("T")[0] })
      fetchData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return
    await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMonth = thisMonth.reduce((s, t) => s + t.amount, 0)
  const totalAll = transactions.reduce((s, t) => s + t.amount, 0)
  const avgMonthly = totalAll / 6

  const categoryData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: transactions.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0),
    color: CATEGORY_COLORS[cat] || "#94A3B8",
  })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value)

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleDateString("es-MX", { month: "short" })
    const value = transactions
      .filter((t) => {
        const td = new Date(t.date)
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
      })
      .reduce((s, t) => s + t.amount, 0)
    return { month, value }
  })

  const filtered = filterCat === "Todos" ? transactions : transactions.filter((t) => t.category === filterCat)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <TrendingDown style={{ color: "#EF4444" }} /> Mis Gastos
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">Controla cada peso que sale de tu bolsillo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Este mes</div>
          <div className="text-2xl font-bold text-red-400">{formatCurrency(totalMonth)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total histórico</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalAll)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Promedio mensual</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(avgMonthly)}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Plus size={18} style={{ color: "#EF4444" }} /> Registrar Gasto
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Monto *</label>
              <input
                type="number" step="0.01" min="0" required
                className="input-dark" placeholder="$0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Categoría</label>
              <select className="input-dark" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Descripción</label>
              <input type="text" className="input-dark" placeholder="Ej: Supermercado"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha</label>
              <input type="date" required className="input-dark" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}>
              {submitting ? "Guardando..." : "Registrar Gasto"}
            </button>
          </form>
        </div>

        {/* Pie chart */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Por Categoría</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3 max-h-36 overflow-y-auto">
                {categoryData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      <span style={{ color: "#94A3B8" }}>{c.name}</span>
                    </div>
                    <span className="text-white">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#475569" }}>
              Sin datos aún
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Evolución Mensual</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" name="Gastos" fill="#EF4444" radius={[6, 6, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">Historial de Gastos</h2>
          <select className="input-dark w-auto text-sm"
            value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option>Todos</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10" style={{ color: "#475569" }}>
            No hay gastos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(239,68,68,0.1)" }}>
                  {["Fecha", "Categoría", "Descripción", "Monto", ""].map((h) => (
                    <th key={h} className="text-left pb-3 pr-4 text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#64748B" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4" style={{ color: "#94A3B8" }}>{formatDate(tx.date)}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${CATEGORY_COLORS[tx.category] || "#94A3B8"}20`, color: CATEGORY_COLORS[tx.category] || "#94A3B8" }}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-white">{tx.description || "-"}</td>
                    <td className="py-3 pr-4 font-semibold text-red-400">-{formatCurrency(tx.amount)}</td>
                    <td className="py-3">
                      <button onClick={() => handleDelete(tx.id)} className="btn-danger p-1.5">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
