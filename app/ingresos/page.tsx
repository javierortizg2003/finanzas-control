"use client"

import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts"
import { TrendingUp, Plus, Trash2, Search, X } from "lucide-react"
import { formatCurrency, formatDate, INCOME_CATEGORIES, CATEGORY_COLORS } from "@/lib/utils"

interface Wallet { id: string; name: string; color: string; type: string; balance: number }
interface Transaction {
  id: string; type: string; amount: number; category: string
  description: string | null; date: string; createdAt: string
  wallet: { id: string; name: string; color: string; type: string } | null
}

export default function IngresosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState({ text: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" })
  const [form, setForm] = useState({
    amount: "", category: INCOME_CATEGORIES[0], description: "",
    date: new Date().toISOString().split("T")[0], walletId: "",
  })

  const fetchData = () => {
    Promise.all([
      fetch("/api/transactions?type=income").then((r) => r.json()),
      fetch("/api/wallets").then((r) => r.json()),
    ]).then(([txs, ws]) => {
      setTransactions(txs)
      setWallets(ws)
    }).finally(() => setLoading(false))
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
        body: JSON.stringify({ ...form, type: "income", walletId: form.walletId || null }),
      })
      setForm({ amount: "", category: INCOME_CATEGORIES[0], description: "", date: new Date().toISOString().split("T")[0], walletId: form.walletId })
      fetchData()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este ingreso?")) return
    await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    fetchData() // refresh wallets too since balance may have changed
  }

  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMonth = thisMonth.reduce((s, t) => s + t.amount, 0)
  const totalAll = transactions.reduce((s, t) => s + t.amount, 0)

  const categoryData = INCOME_CATEGORIES.map((cat) => ({
    name: cat,
    value: transactions.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0),
    color: CATEGORY_COLORS[cat] || "#94A3B8",
  })).filter((c) => c.value > 0)

  const filtered = transactions.filter((t) => {
    if (search.text) {
      const q = search.text.toLowerCase()
      if (![t.description, t.category, t.wallet?.name, t.amount.toString()].some(v => v?.toLowerCase().includes(q))) return false
    }
    if (search.dateFrom && new Date(t.date) < new Date(search.dateFrom)) return false
    if (search.dateTo && new Date(t.date) > new Date(search.dateTo + "T23:59:59")) return false
    if (search.amountMin && t.amount < parseFloat(search.amountMin)) return false
    if (search.amountMax && t.amount > parseFloat(search.amountMax)) return false
    return true
  })
  const hasFilters = Object.values(search).some(Boolean)

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleDateString("es-MX", { month: "short" })
    const value = transactions
      .filter((t) => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() })
      .reduce((s, t) => s + t.amount, 0)
    return { month, value }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <TrendingUp style={{ color: "#10B981" }} /> Mis Ingresos
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">Registra tus ingresos y vincúlalos a una cartera</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Este mes</div>
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalMonth)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total histórico</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalAll)}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Transacciones</div>
          <div className="text-2xl font-bold text-white">{transactions.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Plus size={18} style={{ color: "#10B981" }} /> Registrar Ingreso
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Monto *</label>
              <input type="number" step="0.01" min="0" required className="input-dark" placeholder="$0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Categoría</label>
              <select className="input-dark" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Entra a la cuenta
              </label>
              <select className="input-dark" value={form.walletId}
                onChange={(e) => setForm({ ...form, walletId: e.target.value })}>
                <option value="">Sin asignar</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {formatCurrency(w.balance)}
                  </option>
                ))}
              </select>
              {form.walletId && (
                <div className="mt-1 text-xs" style={{ color: "#10B981" }}>
                  ✓ El saldo de la cartera se actualizará automáticamente
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Descripción</label>
              <input type="text" className="input-dark" placeholder="Ej: Pago quincena"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha</label>
              <input type="date" required className="input-dark" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Guardando..." : "Registrar Ingreso"}
            </button>
          </form>
        </div>

        {/* Charts */}
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
              <div className="space-y-1.5 mt-3">
                {categoryData.slice(0, 5).map((c, i) => (
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
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#475569" }}>Sin datos aún</div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Evolución Mensual</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" name="Ingresos" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">
            Historial de Ingresos
            {hasFilters && <span className="ml-2 text-sm font-normal text-emerald-400">({filtered.length} resultado{filtered.length !== 1 ? "s" : ""})</span>}
          </h2>
          {hasFilters && (
            <button onClick={() => setSearch({ text: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" })}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "#F87171", background: "rgba(239,68,68,0.1)" }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 p-4 rounded-xl" style={{ background: "rgba(6,13,31,0.5)" }}>
          <div className="lg:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-3" style={{ color: "#64748B" }} />
            <input className="input-dark pl-8 text-sm" placeholder="Buscar por descripción, categoría, monto..."
              value={search.text} onChange={(e) => setSearch({ ...search, text: e.target.value })} />
          </div>
          <div>
            <input type="date" className="input-dark text-sm" title="Desde"
              value={search.dateFrom} onChange={(e) => setSearch({ ...search, dateFrom: e.target.value })} />
          </div>
          <div>
            <input type="date" className="input-dark text-sm" title="Hasta"
              value={search.dateTo} onChange={(e) => setSearch({ ...search, dateTo: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <input type="number" className="input-dark text-sm flex-1" placeholder="$ Mín"
              value={search.amountMin} onChange={(e) => setSearch({ ...search, amountMin: e.target.value })} />
            <input type="number" className="input-dark text-sm flex-1" placeholder="$ Máx"
              value={search.amountMax} onChange={(e) => setSearch({ ...search, amountMax: e.target.value })} />
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10" style={{ color: "#475569" }}>No hay ingresos registrados.</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10" style={{ color: "#475569" }}>Ningún ingreso coincide con los filtros aplicados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
                  {["Fecha", "Categoría", "Cuenta", "Descripción", "Monto", ""].map((h) => (
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
                    <td className="py-3 pr-4">
                      {tx.wallet ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: tx.wallet.color }} />
                          <span style={{ color: "#CBD5E1" }}>{tx.wallet.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "#475569" }}>—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-white">{tx.description || "-"}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-400">{formatCurrency(tx.amount)}</td>
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
