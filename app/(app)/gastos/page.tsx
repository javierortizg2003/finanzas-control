"use client"

import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts"
import { TrendingDown, Plus, Trash2, Search, X, Pencil, Check } from "lucide-react"
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"

interface Category { id: string; name: string; color: string; macro?: string | null }
interface Wallet { id: string; name: string; color: string; type: string; balance: number }
interface Debt { id: string; name: string; balance: number; minimumPayment: number }
interface Transaction {
  id: string; type: string; amount: number; category: string
  description: string | null; date: string; createdAt: string
  wallet: { id: string; name: string; color: string; type: string } | null
}
interface EditForm { amount: string; category: string; description: string; date: string; walletId: string }

export default function GastosPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filterCat, setFilterCat] = useState("Todos")
  const [search, setSearch] = useState({ text: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" })
  const [form, setForm] = useState({
    amount: "", category: "", description: "",
    date: new Date().toISOString().split("T")[0], walletId: "", debtId: "",
  })
  const [newCatName, setNewCatName] = useState("")
  const [newCatMacro, setNewCatMacro] = useState("Necesidades")
  const [showAddCat, setShowAddCat] = useState(false)
  const [addingCat, setAddingCat] = useState(false)
  const [walletError, setWalletError] = useState(false)
  // edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ amount: "", category: "", description: "", date: "", walletId: "" })
  const [saving, setSaving] = useState(false)

  const fetchCategories = () =>
    fetch("/api/categories?type=expense")
      .then((r) => r.json())
      .then((cats: Category[]) => {
        setCategories(cats)
        setForm((f) => ({ ...f, category: f.category || cats[0]?.name || "" }))
      })
      .catch(() => {})

  const fetchData = () => {
    Promise.all([
      fetch("/api/transactions?type=expense").then((r) => r.json()),
      fetch("/api/wallets").then((r) => r.json()),
      fetch("/api/debts").then((r) => r.json()),
    ]).then(([txs, ws, ds]: [Transaction[], Wallet[], Debt[]]) => {
      setTransactions(txs)
      setWallets(ws)
      setDebts(ds)
      if (ws.length > 0) setForm((f) => ({ ...f, walletId: f.walletId || ws[0].id }))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchCategories(); fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.walletId) { setWalletError(true); return }
    if (!form.amount || parseFloat(form.amount) <= 0) return
    setWalletError(false)
    setSubmitting(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, type: "expense", walletId: form.walletId,
          debtId: form.debtId || undefined,
        }),
      })
      if (res.ok) {
        setForm((f) => ({
          amount: "", category: categories[0]?.name || f.category,
          description: "", date: new Date().toISOString().split("T")[0], walletId: f.walletId, debtId: "",
        }))
        fetchData()
      }
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    if (!res.ok) { alert("No se pudo eliminar."); return }
    fetchData()
  }

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setEditForm({
      amount: tx.amount.toString(),
      category: tx.category,
      description: tx.description || "",
      date: new Date(tx.date).toISOString().split("T")[0],
      walletId: tx.wallet?.id || wallets[0]?.id || "",
    })
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) { setEditingId(null); fetchData() }
      else { alert("No se pudo guardar el cambio.") }
    } finally { setSaving(false) }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), type: "expense", macro: newCatMacro }),
      })
      if (res.ok) {
        setNewCatName(""); setNewCatMacro("Necesidades"); setShowAddCat(false)
        await fetchCategories()
        const data = await res.json()
        setForm((f) => ({ ...f, category: data.name }))
      } else {
        const err = await res.json(); alert(err.error || "Error al crear categoría")
      }
    } finally { setAddingCat(false) }
  }

  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMonth = thisMonth.reduce((s, t) => s + t.amount, 0)
  const totalAll = transactions.reduce((s, t) => s + t.amount, 0)
  const avgMonthly = totalAll / 6

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.color]))

  const categoryData = (() => {
    const grouped: Record<string, number> = {}
    for (const t of transactions) grouped[t.category] = (grouped[t.category] || 0) + t.amount
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, color: catMap[name] || CATEGORY_COLORS[name] || "#94A3B8" }))
      .sort((a, b) => b.value - a.value)
  })()

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleDateString("es-MX", { month: "short" })
    const value = transactions
      .filter((t) => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() })
      .reduce((s, t) => s + t.amount, 0)
    return { month, value }
  })

  const filterOptions = [
    "Todos",
    ...categories.map((c) => c.name),
    ...transactions.map((t) => t.category).filter((cat) => !categories.some((c) => c.name === cat)).filter((c, i, a) => a.indexOf(c) === i),
  ]

  const filtered = transactions.filter((t) => {
    if (filterCat !== "Todos" && t.category !== filterCat) return false
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
  const hasFilters = Object.values(search).some(Boolean) || filterCat !== "Todos"

  const inputSm = "input-dark text-xs py-1.5"

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
        <p style={{ color: "#64748B" }} className="mt-1">Registra tus gastos y vincúlalos a una cartera</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Este mes</div>
          <div className="text-2xl font-bold text-red-400"><MaskedAmount amount={totalMonth} /></div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total histórico</div>
          <div className="text-2xl font-bold text-white"><MaskedAmount amount={totalAll} /></div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Promedio mensual</div>
          <div className="text-2xl font-bold text-white"><MaskedAmount amount={avgMonthly} /></div>
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
              <input type="number" step="0.01" min="0" required className="input-dark" placeholder="$0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Categoría</label>
              <select className="input-dark" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, debtId: "" })}>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              {/* Debt sub-selector — only when "Deudas" category is selected */}
              {form.category === "Deudas" && debts.length > 0 && (
                <div className="mt-2 p-3 rounded-xl" style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#F87171" }}>
                    ¿A qué deuda corresponde este pago?
                  </label>
                  <select className="input-dark text-xs w-full" value={form.debtId}
                    onChange={(e) => setForm({ ...form, debtId: e.target.value })}>
                    <option value="">— Selecciona una deuda —</option>
                    {debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (saldo: ${d.balance.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </option>
                    ))}
                  </select>
                  {form.debtId && (
                    <p className="mt-1.5 text-xs" style={{ color: "#64748B" }}>
                      El saldo de esta deuda se reducirá automáticamente al registrar el pago.
                    </p>
                  )}
                </div>
              )}
              {!showAddCat ? (
                <button type="button" onClick={() => setShowAddCat(true)}
                  className="mt-1.5 text-xs transition-colors" style={{ color: "#64748B" }}>
                  + Agregar categoría personalizada
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <input type="text" placeholder="Ej: Ejercicio, Belleza..." className="input-dark text-xs w-full"
                    value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())} autoFocus />
                  <select className="input-dark text-xs w-full" value={newCatMacro}
                    onChange={(e) => setNewCatMacro(e.target.value)}>
                    <option value="Necesidades">🏠 Necesidades</option>
                    <option value="Deseos">🎯 Deseos</option>
                    <option value="Ahorro/Inversión">💰 Ahorro / Inversión</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddCategory} disabled={addingCat || !newCatName.trim()}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(99,102,241,0.2)", color: "#818CF8" }}>
                      {addingCat ? "..." : "Agregar"}
                    </button>
                    <button type="button" onClick={() => { setShowAddCat(false); setNewCatName(""); setNewCatMacro("Necesidades") }}
                      className="px-2 text-xs" style={{ color: "#64748B" }}>✕</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                Sale de la cuenta *
              </label>
              <select className="input-dark" value={form.walletId}
                onChange={(e) => { setForm({ ...form, walletId: e.target.value }); setWalletError(false) }}
                required>
                <option value="" disabled>Selecciona una cartera</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} — {formatCurrency(w.balance)}</option>
                ))}
              </select>
              {walletError && (
                <p className="mt-1 text-xs text-red-400">Debes seleccionar una cartera</p>
              )}
              {form.walletId && !walletError && (
                <div className="mt-1 text-xs text-red-400">✓ Se descontará automáticamente</div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Descripción</label>
              <input type="text" className="input-dark" placeholder="Ej: Supermercado"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha</label>
              <input type="date" required className="input-dark" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <button type="submit" disabled={submitting || !form.walletId}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-white transition-all"
              style={{ background: !form.walletId ? "rgba(220,38,38,0.3)" : "linear-gradient(135deg, #DC2626, #EF4444)", cursor: !form.walletId ? "not-allowed" : "pointer" }}>
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
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
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
                    <span className="text-white"><MaskedAmount amount={c.value} /></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#475569" }}>Sin datos aún</div>
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
          <h2 className="text-lg font-semibold text-white">
            Historial de Gastos
            {hasFilters && <span className="ml-2 text-sm font-normal text-red-400">({filtered.length} resultado{filtered.length !== 1 ? "s" : ""})</span>}
          </h2>
          {hasFilters && (
            <button onClick={() => { setSearch({ text: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" }); setFilterCat("Todos") }}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "#F87171", background: "rgba(239,68,68,0.1)" }}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>

        {/* Search + Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5 p-4 rounded-xl" style={{ background: "var(--bg-hover)" }}>
          <div className="lg:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-3" style={{ color: "#64748B" }} />
            <input className="input-dark pl-8 text-sm" placeholder="Buscar..."
              value={search.text} onChange={(e) => setSearch({ ...search, text: e.target.value })} />
          </div>
          <div>
            <select className="input-dark text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              {filterOptions.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
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
          <div className="text-center py-10" style={{ color: "#475569" }}>No hay gastos registrados.</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10" style={{ color: "#475569" }}>Ningún gasto coincide con los filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(239,68,68,0.1)" }}>
                  {["Fecha", "Categoría", "Cuenta", "Descripción", "Monto", ""].map((h) => (
                    <th key={h} className="text-left pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748B" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const catColor = catMap[tx.category] || CATEGORY_COLORS[tx.category] || "#94A3B8"

                  if (tx.id === editingId) {
                    return (
                      <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(99,102,241,0.06)" }}>
                        <td className="py-2 pr-2">
                          <input type="date" className={inputSm} value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                        </td>
                        <td className="py-2 pr-2">
                          <select className={inputSm} value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <select className={inputSm} value={editForm.walletId}
                            onChange={(e) => setEditForm({ ...editForm, walletId: e.target.value })}>
                            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input type="text" className={inputSm} value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" step="0.01" className={inputSm} value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveEdit(tx.id)} disabled={saving}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: "rgba(100,116,139,0.2)", color: "#94A3B8" }}>
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4" style={{ color: "#94A3B8" }}>{formatDate(tx.date)}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${catColor}20`, color: catColor }}>{tx.category}</span>
                      </td>
                      <td className="py-3 pr-4">
                        {tx.wallet ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: tx.wallet.color }} />
                            <span style={{ color: "#CBD5E1" }}>{tx.wallet.name}</span>
                          </span>
                        ) : <span className="text-xs" style={{ color: "#475569" }}>—</span>}
                      </td>
                      <td className="py-3 pr-4 text-white">{tx.description || "-"}</td>
                      <td className="py-3 pr-4 font-semibold text-red-400">-<MaskedAmount amount={tx.amount} /></td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(tx)}
                            className="p-1.5 rounded-lg transition-colors" title="Editar"
                            style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8" }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(tx.id)} className="btn-danger p-1.5" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
