"use client"

import { useEffect, useState } from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { TrendingUp, Plus, Trash2, ChevronRight, ArrowDownLeft } from "lucide-react"
import {
  formatCurrency, formatDate, formatPercent, SAVING_TYPES,
  calculateSavingCurrentValue, generateSavingGrowthData,
} from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"

interface Wallet { id: string; name: string; color: string; balance: number }
interface SavingDeposit {
  id: string; savingId: string; amount: number; note: string | null; date: string
  wallet: { id: string; name: string; color: string } | null
}
interface Saving {
  id: string; name: string; institution: string | null
  type: string; currency: string; interestRate: number; color: string
  deposits: SavingDeposit[]
}

const COLORS = ["#10B981", "#6366F1", "#F59E0B", "#EC4899", "#14B8A6", "#8B5CF6", "#EF4444"]

const GrowthTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; color: string; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 14px" }}>
      <div className="text-xs font-semibold text-white mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-xs flex gap-2 mb-0.5">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-white font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && payload[1].value > payload[0].value && (
        <div className="text-xs mt-1 pt-1 text-emerald-400" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          Intereses: {formatCurrency(payload[1].value - payload[0].value)}
        </div>
      )}
    </div>
  )
}

export default function AhorrosPage() {
  const [savings, setSavings] = useState<Saving[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [baseCurrency, setBaseCurrency] = useState("MXN")
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSavingForm, setShowSavingForm] = useState(false)
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit")
  const [depositForm, setDepositForm] = useState({
    amount: "", note: "", date: new Date().toISOString().split("T")[0], walletId: "",
  })
  const [savingForm, setSavingForm] = useState({
    name: "", institution: "", type: SAVING_TYPES[0], interestRate: "0", currency: "",
  })

  const fetchData = () => {
    Promise.all([
      fetch("/api/savings").then((r) => r.json()),
      fetch("/api/wallets").then((r) => r.json()),
      fetch("/api/preferences").then((r) => r.json()),
    ]).then(([s, w, pref]) => {
      setSavings(s)
      setWallets(w)
      if (pref?.baseCurrency) {
        setBaseCurrency(pref.baseCurrency)
        setSavingForm(f => f.currency ? f : { ...f, currency: pref.baseCurrency })
      }
      if (!selected && s.length > 0) setSelected(s[0].id)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleCreateSaving = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...savingForm, currency: baseCurrency, color: COLORS[savings.length % COLORS.length] }),
      })
      const created: Saving = await res.json()
      setSavingForm({ name: "", institution: "", type: SAVING_TYPES[0], interestRate: "0", currency: baseCurrency })
      setShowSavingForm(false)
      fetchData()
      setSelected(created.id)
    } finally { setSubmitting(false) }
  }

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !depositForm.amount) return
    const rawAmount = parseFloat(depositForm.amount)
    if (!rawAmount || rawAmount <= 0) return
    setSubmitting(true)
    const amount = mode === "withdraw" ? -rawAmount : rawAmount
    try {
      await fetch(`/api/savings/${selected}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...depositForm, amount }),
      })
      setDepositForm({ amount: "", note: "", date: new Date().toISOString().split("T")[0], walletId: depositForm.walletId })
      fetchData()
    } finally { setSubmitting(false) }
  }

  const handleDeleteDeposit = async (savingId: string, depositId: string) => {
    if (!confirm("¿Eliminar este movimiento? El saldo de la cartera vinculada se ajustará.")) return
    const res = await fetch(`/api/savings/${savingId}/deposits/${depositId}`, { method: "DELETE" })
    if (!res.ok) {
      alert("No se pudo eliminar el movimiento. Intenta de nuevo.")
      return
    }
    fetchData()
  }

  const handleDeleteSaving = async (id: string) => {
    if (!confirm("¿Eliminar este fondo y todos sus movimientos?")) return
    const res = await fetch(`/api/savings/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("No se pudo eliminar el fondo. Intenta de nuevo.")
      return
    }
    fetchData()
    setSelected(savings.find((s) => s.id !== id)?.id ?? null)
  }

  const selectedSaving = savings.find((s) => s.id === selected)
  const totalValue = savings.reduce((sum, s) => sum + calculateSavingCurrentValue(s.deposits, s.interestRate), 0)
  const totalPrincipal = savings.reduce((sum, s) => sum + s.deposits.reduce((d, dep) => d + dep.amount, 0), 0)
  const totalInterest = totalValue - totalPrincipal

  const growthData = selectedSaving
    ? generateSavingGrowthData(
        selectedSaving.deposits.map((d) => ({ amount: d.amount, date: d.date })),
        selectedSaving.interestRate
      )
    : []

  const selectedDeposits = selectedSaving?.deposits ?? []
  const selectedPrincipal = selectedDeposits.reduce((s, d) => s + d.amount, 0)
  const selectedValue = selectedSaving
    ? calculateSavingCurrentValue(selectedDeposits, selectedSaving.interestRate)
    : 0
  const selectedInterest = selectedValue - selectedPrincipal
  const nowLabel = new Date().toLocaleDateString("es-MX", { month: "short", year: "2-digit" })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp style={{ color: "#6366F1" }} /> Fondos de Inversión
          </h1>
          <p style={{ color: "#64748B" }} className="mt-1">
            Controla depósitos, retiros e intereses de cada fondo. Vincula con tus carteras.
          </p>
        </div>
        <button onClick={() => setShowSavingForm(!showSavingForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Nuevo Fondo
        </button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Valor total</div>
          <div className="text-2xl font-bold text-white"><MaskedAmount amount={totalValue} /></div>
          <div className="text-xs mt-1 text-emerald-400">Con intereses</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Capital neto</div>
          <div className="text-2xl font-bold text-white"><MaskedAmount amount={totalPrincipal} /></div>
          <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Depósitos − retiros</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Intereses ganados</div>
          <div className="text-2xl font-bold text-indigo-400"><MaskedAmount amount={totalInterest} /></div>
          <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Dinero extra</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Fondos activos</div>
          <div className="text-2xl font-bold text-white">{savings.length}</div>
          <div className="text-xs mt-1 text-emerald-400">
            {totalPrincipal > 0 ? `+${formatPercent((totalInterest / totalPrincipal) * 100)} rendimiento` : ""}
          </div>
        </div>
      </div>

      {/* New Saving Form */}
      {showSavingForm && (
        <div className="glass-card rounded-2xl p-6 mb-6 fade-in">
          <h2 className="text-lg font-semibold text-white mb-4">Nuevo Fondo de Inversión</h2>
          <form onSubmit={handleCreateSaving}>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Nombre *</label>
                <input type="text" required className="input-dark" placeholder="Ej: CETES 2025"
                  value={savingForm.name} onChange={(e) => setSavingForm({ ...savingForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Institución</label>
                <input type="text" className="input-dark" placeholder="Ej: Fintual, XTB..."
                  value={savingForm.institution} onChange={(e) => setSavingForm({ ...savingForm, institution: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Tipo</label>
                <select className="input-dark" value={savingForm.type} onChange={(e) => setSavingForm({ ...savingForm, type: e.target.value })}>
                  {SAVING_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Moneda</label>
                <select className="input-dark" value={savingForm.currency || baseCurrency}
                  onChange={(e) => setSavingForm({ ...savingForm, currency: e.target.value })}>
                  <optgroup label="Fiat">
                    <option value="MXN">🇲🇽 MXN — Peso Mexicano</option>
                    <option value="USD">🇺🇸 USD — Dólar</option>
                    <option value="EUR">🇪🇺 EUR — Euro</option>
                    <option value="COP">🇨🇴 COP — Peso Colombiano</option>
                    <option value="ARS">🇦🇷 ARS — Peso Argentino</option>
                    <option value="CLP">🇨🇱 CLP — Peso Chileno</option>
                  </optgroup>
                  <optgroup label="Crypto">
                    <option value="BTC">₿ BTC — Bitcoin</option>
                    <option value="ETH">Ξ ETH — Ethereum</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Tasa de interés anual (%)</label>
                <input type="number" step="0.01" min="0" max="100" className="input-dark" placeholder="0.00"
                  value={savingForm.interestRate} onChange={(e) => setSavingForm({ ...savingForm, interestRate: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="py-2.5 px-6 rounded-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)" }}>
                {submitting ? "Creando..." : "Crear Fondo"}
              </button>
              <button type="button" onClick={() => setShowSavingForm(false)}
                className="py-2.5 px-6 rounded-xl font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {savings.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📈</div>
          <div className="text-xl font-semibold text-white mb-2">Sin fondos de inversión</div>
          <p style={{ color: "#64748B" }} className="mb-6">Crea tu primer fondo y empieza a rastrear tus depósitos e intereses</p>
          <button onClick={() => setShowSavingForm(true)} className="btn-primary">Crear fondo</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left: Fund List */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "#64748B" }}>Fondos</div>
            {savings.map((s) => {
              const value = calculateSavingCurrentValue(s.deposits, s.interestRate)
              const principal = s.deposits.reduce((sum, d) => sum + d.amount, 0)
              const interest = value - principal
              const isSelected = selected === s.id
              return (
                <button key={s.id} onClick={() => setSelected(s.id)}
                  className="w-full text-left p-4 rounded-xl transition-all"
                  style={{
                    background: isSelected ? `${s.color}15` : "var(--bg-hover)",
                    border: `1px solid ${isSelected ? s.color + "40" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                      <div>
                        <div className="text-sm font-medium text-white truncate max-w-32">{s.name}</div>
                        {s.institution && <div className="text-xs" style={{ color: "#64748B" }}>{s.institution}</div>}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: isSelected ? s.color : "#475569" }} />
                  </div>
                  <div className="mt-2">
                    <div className="text-base font-bold text-white"><MaskedAmount amount={value} /></div>
                    {interest > 0 && <div className="text-xs text-emerald-400">+{formatCurrency(interest)} intereses</div>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right: Selected Fund Detail */}
          {selectedSaving && (
            <div className="lg:col-span-3 space-y-5">
              {/* Header */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: selectedSaving.color }} />
                      <h2 className="text-xl font-bold text-white">{selectedSaving.name}</h2>
                      {selectedSaving.institution && (
                        <span className="text-sm" style={{ color: "#64748B" }}>· {selectedSaving.institution}</span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: "#64748B" }}>
                      {selectedSaving.type} · {formatPercent(selectedSaving.interestRate)} anual
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSaving(selectedSaving.id)} className="btn-danger p-1.5">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-xs mb-1" style={{ color: "#64748B" }}>Capital neto</div>
                    <div className="text-xl font-bold text-white"><MaskedAmount amount={selectedPrincipal} /></div>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: "#64748B" }}>Valor actual</div>
                    <div className="text-xl font-bold text-emerald-400"><MaskedAmount amount={selectedValue} /></div>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: "#64748B" }}>Intereses</div>
                    <div className="text-xl font-bold text-indigo-400"><MaskedAmount amount={selectedInterest} /></div>
                    {selectedPrincipal > 0 && (
                      <div className="text-xs text-emerald-400">
                        +{formatPercent((selectedInterest / Math.max(0.01, selectedPrincipal)) * 100)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Growth Chart */}
              {growthData.length > 1 && (
                <div className="glass-card rounded-2xl p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-white">Crecimiento del fondo</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                      Histórico + proyección 12 meses · Zona verde = intereses sobre tu capital
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={growthData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                      <defs>
                        <linearGradient id="principalGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="valueGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                        interval={Math.floor(growthData.length / 6)} />
                      <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
                      <Tooltip content={<GrowthTooltip />} />
                      <ReferenceLine x={nowLabel} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"
                        label={{ value: "Hoy", position: "top", fill: "#94A3B8", fontSize: 10 }} />
                      <Area type="monotone" dataKey="principal" name="Capital neto"
                        stroke="#6366F1" fill="url(#principalGrad2)" strokeWidth={2} />
                      <Area type="monotone" dataKey="value" name="Valor con intereses"
                        stroke="#10B981" fill="url(#valueGrad2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex gap-5 mt-2">
                    {[
                      { color: "#6366F1", label: "Capital neto (depósitos − retiros)" },
                      { color: "#10B981", label: "Valor con intereses" },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
                        <div className="w-3 h-1.5 rounded" style={{ background: l.color }} /> {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deposit / Withdraw Form */}
              <div className="glass-card rounded-2xl p-5">
                {/* Mode toggle */}
                <div className="flex gap-2 mb-4 p-1 rounded-xl w-fit"
                  style={{ background: "var(--bg-input)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {([
                    { key: "deposit", label: "📥 Depositar", color: "#10B981" },
                    { key: "withdraw", label: "📤 Retirar", color: "#EF4444" },
                  ] as const).map(({ key, label, color }) => (
                    <button key={key} onClick={() => setMode(key)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: mode === key ? `${color}20` : "transparent",
                        color: mode === key ? color : "#64748B",
                        border: mode === key ? `1px solid ${color}30` : "1px solid transparent",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>

                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  {mode === "deposit"
                    ? <><Plus size={16} style={{ color: "#10B981" }} /> Registrar Depósito</>
                    : <><ArrowDownLeft size={16} style={{ color: "#EF4444" }} /> Registrar Retiro</>
                  }
                </h3>

                <form onSubmit={handleAddMovement}>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                        Monto *
                      </label>
                      <input type="number" step="0.01" min="0" required className="input-dark" placeholder="$0.00"
                        value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
                        {mode === "deposit" ? "Proviene de la cartera" : "Llega a la cartera"}
                      </label>
                      <select className="input-dark" value={depositForm.walletId}
                        onChange={(e) => setDepositForm({ ...depositForm, walletId: e.target.value })}>
                        <option value="">Sin vincular</option>
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>{w.name} — {formatCurrency(w.balance)}</option>
                        ))}
                      </select>
                      {depositForm.walletId && (
                        <div className="text-xs mt-1" style={{ color: mode === "deposit" ? "#EF4444" : "#10B981" }}>
                          {mode === "deposit"
                            ? "✓ Se descontará del saldo de la cartera"
                            : "✓ Se sumará al saldo de la cartera"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha *</label>
                      <input type="date" required className="input-dark" value={depositForm.date}
                        onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Nota</label>
                      <input type="text" className="input-dark"
                        placeholder={mode === "deposit" ? "Ej: Aportación enero" : "Ej: Retiro para emergencia"}
                        value={depositForm.note} onChange={(e) => setDepositForm({ ...depositForm, note: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="py-2.5 px-5 rounded-xl font-semibold text-white text-sm"
                    style={{
                      background: mode === "deposit"
                        ? "linear-gradient(135deg, #059669, #10B981)"
                        : "linear-gradient(135deg, #DC2626, #EF4444)"
                    }}>
                    {submitting ? "Guardando..." : mode === "deposit" ? "Registrar Depósito" : "Registrar Retiro"}
                  </button>
                </form>
              </div>

              {/* Movement History */}
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-white mb-4">
                  Historial de Movimientos
                  <span className="ml-2 text-sm font-normal" style={{ color: "#64748B" }}>
                    ({selectedDeposits.length} movimientos)
                  </span>
                </h3>
                {selectedDeposits.length === 0 ? (
                  <div className="text-center py-8" style={{ color: "#475569" }}>
                    Sin movimientos. Registra tu primer depósito.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
                          {["Fecha", "Tipo", "Monto", "Valor actual", "Intereses", "Cartera", "Nota", ""].map((h) => (
                            <th key={h} className="text-left pb-3 pr-4 text-xs font-medium uppercase tracking-wider"
                              style={{ color: "#64748B" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedDeposits]
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map((dep) => {
                            const isWithdrawal = dep.amount < 0
                            const monthlyRate = selectedSaving.interestRate / 100 / 12
                            const now = new Date()
                            const start = new Date(dep.date)
                            const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
                            const currentVal = dep.amount * Math.pow(1 + monthlyRate, months)
                            const earned = currentVal - dep.amount
                            return (
                              <tr key={dep.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                                className="hover:bg-white/5 transition-colors">
                                <td className="py-3 pr-4" style={{ color: "#94A3B8" }}>{formatDate(dep.date)}</td>
                                <td className="py-3 pr-4">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      background: isWithdrawal ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                                      color: isWithdrawal ? "#F87171" : "#34D399"
                                    }}>
                                    {isWithdrawal ? "📤 Retiro" : "📥 Depósito"}
                                  </span>
                                </td>
                                <td className={`py-3 pr-4 font-semibold ${isWithdrawal ? "text-red-400" : "text-white"}`}>
                                  {isWithdrawal ? "-" : "+"}<MaskedAmount amount={Math.abs(dep.amount)} />
                                </td>
                                <td className="py-3 pr-4 text-emerald-400 font-semibold"><MaskedAmount amount={Math.abs(currentVal)} /></td>
                                <td className="py-3 pr-4 text-indigo-400">
                                  {!isWithdrawal && earned > 0 ? `+${formatCurrency(earned)}` : "—"}
                                </td>
                                <td className="py-3 pr-4">
                                  {dep.wallet ? (
                                    <span className="flex items-center gap-1.5 text-xs">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dep.wallet.color }} />
                                      <span style={{ color: "#CBD5E1" }}>{dep.wallet.name}</span>
                                    </span>
                                  ) : <span style={{ color: "#475569" }} className="text-xs">—</span>}
                                </td>
                                <td className="py-3 pr-4 text-xs" style={{ color: "#64748B" }}>{dep.note || "—"}</td>
                                <td className="py-3">
                                  <button onClick={() => handleDeleteDeposit(selectedSaving.id, dep.id)} className="btn-danger p-1.5">
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "1px solid rgba(16,185,129,0.2)" }}>
                          <td className="pt-3 text-xs font-medium" style={{ color: "#64748B" }}>NETO</td>
                          <td className="pt-3" />
                          <td className={`pt-3 font-bold ${selectedPrincipal >= 0 ? "text-white" : "text-red-400"}`}>
                            <MaskedAmount amount={selectedPrincipal} />
                          </td>
                          <td className="pt-3 font-bold text-emerald-400"><MaskedAmount amount={selectedValue} /></td>
                          <td className="pt-3 font-bold text-indigo-400">+<MaskedAmount amount={selectedInterest} /></td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
