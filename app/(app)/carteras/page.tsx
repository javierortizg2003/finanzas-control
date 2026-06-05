"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Wallet, Plus, ArrowLeftRight, Trash2, Edit3, Check, X, ChevronRight } from "lucide-react"
import { formatCurrency, formatDate, WALLET_TYPES, getWalletType } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"

interface WalletData {
  id: string
  name: string
  type: string
  bank: string | null
  currency: string
  balance: number
  initialBalance: number | null
  creditLimit: number | null
  color: string
  createdAt: string
  transactions: { type: string; amount: number }[]
}

interface Transfer {
  id: string
  fromWalletId: string
  toWalletId: string
  amount: number
  description: string | null
  date: string
  fromWallet: { name: string; color: string }
  toWallet: { name: string; color: string }
}

const WALLET_COLORS = [
  "#10B981", "#6366F1", "#F59E0B", "#EC4899",
  "#14B8A6", "#EF4444", "#8B5CF6", "#F97316", "#0EA5E9", "#22C55E",
]

function toBase(amount: number, from: string, to: string, rateMap: Map<string, number>): number {
  if (from === to) return amount
  const direct = rateMap.get(`${from}→${to}`)
  if (direct !== undefined) return amount * direct
  const inverse = rateMap.get(`${to}→${from}`)
  if (inverse !== undefined && inverse !== 0) return amount / inverse
  return amount
}

export default function CarterasPage() {
  const [wallets, setWallets] = useState<WalletData[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [rateMap, setRateMap] = useState<Map<string, number>>(new Map())
  const [baseCurrency, setBaseCurrency] = useState("MXN")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "", type: "BANK_ACCOUNT", bank: "", balance: "0",
    currency: "USD", color: WALLET_COLORS[0], creditLimit: "",
  })
  const [editForm, setEditForm] = useState<typeof form | null>(null)
  const [transferForm, setTransferForm] = useState({
    fromWalletId: "", toWalletId: "", amount: "",
    description: "", date: new Date().toISOString().split("T")[0],
  })

  const fetchData = () => {
    Promise.all([
      fetch("/api/wallets").then((r) => r.json()),
      fetch("/api/transfers").then((r) => r.json()),
      fetch("/api/exchange-rates").then((r) => r.json()),
      fetch("/api/preferences").then((r) => r.json()),
    ]).then(([w, t, rates, pref]) => {
      setWallets(w)
      setTransfers(t)
      if (pref?.baseCurrency) setBaseCurrency(pref.baseCurrency)
      if (Array.isArray(rates)) {
        const map = new Map<string, number>()
        for (const r of rates) map.set(`${r.fromCurrency}→${r.toCurrency}`, r.rate)
        setRateMap(map)
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          color: WALLET_COLORS[wallets.length % WALLET_COLORS.length],
          creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
        }),
      })
      setForm({ name: "", type: "BANK_ACCOUNT", bank: "", balance: "0", currency: "USD", color: WALLET_COLORS[0], creditLimit: "" })
      setShowForm(false)
      fetchData()
    } finally { setSubmitting(false) }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm) return
    await fetch(`/api/wallets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditing(null)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cartera? Los datos de transferencias ligadas también se eliminarán.")) return
    const res = await fetch(`/api/wallets/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("No se pudo eliminar la cartera. Intenta de nuevo.")
      return
    }
    fetchData()
  }

  const handleConversion = async (e: React.FormEvent) => {
    e.preventDefault()
    const fromWallet = wallets.find((w) => w.id === transferForm.fromWalletId)
    const toWallet = wallets.find((w) => w.id === transferForm.toWalletId)

    if (!fromWallet || !toWallet) return
    if (fromWallet.currency === toWallet.currency) {
      alert("Las carteras tienen la misma moneda. Usa la transferencia normal.")
      return
    }

    const amountFrom = parseFloat(transferForm.amount)
    const exchangeRate = prompt(`Tasa de cambio 1 ${fromWallet.currency} = X ${toWallet.currency}`)
    if (!exchangeRate) return

    const amountTo = amountFrom * parseFloat(exchangeRate)
    setSubmitting(true)
    try {
      await fetch("/api/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWalletId: transferForm.fromWalletId,
          toWalletId: transferForm.toWalletId,
          amountFrom,
          amountTo,
          exchangeRate: parseFloat(exchangeRate),
          description: transferForm.description,
          date: transferForm.date,
        }),
      })
      setTransferForm({
        fromWalletId: "", toWalletId: "", amount: "",
        description: "", date: new Date().toISOString().split("T")[0],
      })
      setShowTransfer(false)
      fetchData()
    } finally { setSubmitting(false) }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (transferForm.fromWalletId === transferForm.toWalletId) {
      alert("Las cuentas origen y destino deben ser diferentes")
      return
    }
    setSubmitting(true)
    try {
      await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm),
      })
      setTransferForm({ fromWalletId: "", toWalletId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] })
      setShowTransfer(false)
      fetchData()
    } finally { setSubmitting(false) }
  }

  // All totals converted to baseCurrency
  const totalBalance = wallets
    .filter((w) => w.type !== "CREDIT_CARD")
    .reduce((s, w) => s + toBase(w.balance, w.currency, baseCurrency, rateMap), 0)

  // Credit card debt: always positive (abs) then subtract from net worth
  const totalCredit = wallets
    .filter((w) => w.type === "CREDIT_CARD")
    .reduce((s, w) => s + toBase(Math.abs(w.balance), w.currency, baseCurrency, rateMap), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet style={{ color: "#10B981" }} /> Mis Carteras
          </h1>
          <p style={{ color: "#64748B" }} className="mt-1">Gestiona todas tus cuentas y mueve dinero entre ellas</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowTransfer(!showTransfer)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.3)" }}>
            <ArrowLeftRight size={16} /> Transferir
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Nueva Cartera
          </button>
        </div>
      </div>

      {/* Net worth */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Patrimonio neto</div>
            <div className="text-3xl font-bold text-emerald-400">
              <MaskedAmount amount={totalBalance - totalCredit} currency={baseCurrency} />
            </div>
            <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>Activos - Deudas · {baseCurrency}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Total activos</div>
            <div className="text-2xl font-bold text-white">
              <MaskedAmount amount={totalBalance} currency={baseCurrency} />
            </div>
            <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>{wallets.filter(w => w.type !== "CREDIT_CARD").length} cuentas</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Deuda en crédito</div>
            <div className="text-2xl font-bold text-red-400">
              <MaskedAmount amount={totalCredit} currency={baseCurrency} />
            </div>
            <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>{wallets.filter(w => w.type === "CREDIT_CARD").length} tarjetas</div>
          </div>
        </div>
      </div>

      {/* Transfer Form */}
      {showTransfer && (
        <div className="glass-card rounded-2xl p-6 mb-6 fade-in">
          {(() => {
            const fromWallet = wallets.find((w) => w.id === transferForm.fromWalletId)
            const toWallet = wallets.find((w) => w.id === transferForm.toWalletId)
            const isDifferentCurrency = fromWallet && toWallet && fromWallet.currency !== toWallet.currency
            return (
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowLeftRight size={18} style={{ color: isDifferentCurrency ? "#F59E0B" : "#6366F1" }} />
                {isDifferentCurrency ? "Conversión de Moneda" : "Nueva Transferencia"}
              </h2>
            )
          })()}
          <form onSubmit={(e) => {
            const fromWallet = wallets.find((w) => w.id === transferForm.fromWalletId)
            const toWallet = wallets.find((w) => w.id === transferForm.toWalletId)
            if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
              handleConversion(e)
            } else {
              handleTransfer(e)
            }
          }}>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Cuenta origen</label>
                <select required className="input-dark" value={transferForm.fromWalletId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromWalletId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} — {formatCurrency(w.balance, w.currency)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-center pb-2">
                <ArrowLeftRight size={20} style={{ color: "#6366F1" }} />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Cuenta destino</label>
                <select required className="input-dark" value={transferForm.toWalletId}
                  onChange={(e) => setTransferForm({ ...transferForm, toWalletId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {wallets.filter((w) => w.id !== transferForm.fromWalletId).map((w) => (
                    <option key={w.id} value={w.id}>{w.name} — {formatCurrency(w.balance, w.currency)}</option>
                  ))}
                </select>
              </div>
            </div>
            {(() => {
              const fromWallet = wallets.find((w) => w.id === transferForm.fromWalletId)
              const toWallet = wallets.find((w) => w.id === transferForm.toWalletId)
              const isDifferent = fromWallet && toWallet && fromWallet.currency !== toWallet.currency
              return isDifferent ? (
                <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#F59E0B" }}>
                    💱 Conversión manual: {fromWallet.currency} → {toWallet.currency}
                  </div>
                  <div className="text-xs" style={{ color: "#94A3B8" }}>
                    Ingresa el monto en {fromWallet.currency} y se te pedirá la tasa de cambio. Luego se deducirá de {fromWallet.name} y se acreditará en {toWallet.name}.
                  </div>
                </div>
              ) : null
            })()}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Monto *</label>
                <input type="number" step="0.01" min="0" required className="input-dark" placeholder="$0.00"
                  value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Descripción</label>
                <input type="text" className="input-dark" placeholder="Ej: Depósito a broker"
                  value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha</label>
                <input type="date" required className="input-dark" value={transferForm.date}
                  onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="py-2.5 px-6 rounded-xl font-semibold text-white"
                style={{
                  background: (() => {
                    const fromWallet = wallets.find((w) => w.id === transferForm.fromWalletId)
                    const toWallet = wallets.find((w) => w.id === transferForm.toWalletId)
                    const isDifferent = fromWallet && toWallet && fromWallet.currency !== toWallet.currency
                    return isDifferent ? "linear-gradient(135deg, #F59E0B, #FBBF24)" : "linear-gradient(135deg, #4F46E5, #6366F1)"
                  })()
                }}>
                {(() => {
                  const fromWallet = wallets.find((w) => w.id === transferForm.fromWalletId)
                  const toWallet = wallets.find((w) => w.id === transferForm.toWalletId)
                  const isDifferent = fromWallet && toWallet && fromWallet.currency !== toWallet.currency
                  if (submitting) return isDifferent ? "Convirtiendo..." : "Transfiriendo..."
                  return isDifferent ? "Realizar Conversión" : "Realizar Transferencia"
                })()}
              </button>
              <button type="button" onClick={() => setShowTransfer(false)}
                className="py-2.5 px-6 rounded-xl font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Wallet Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 mb-6 fade-in">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={18} style={{ color: "#10B981" }} /> Agregar Cartera
          </h2>
          <form onSubmit={handleCreate}>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Nombre *</label>
                <input type="text" required className="input-dark" placeholder="Ej: BBVA Nómina"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Tipo</label>
                <select className="input-dark" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {WALLET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Banco / Institución</label>
                <input type="text" className="input-dark" placeholder="Ej: BBVA, XTB, Santander"
                  value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Moneda</label>
                <select className="input-dark" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">🇺🇸 Dólar Estadounidense (USD)</option>
                  <option value="MXN">🇲🇽 Peso Mexicano (MXN)</option>
                  <option value="EUR">🇪🇺 Euro (EUR)</option>
                  <option value="COP">🇨🇴 Peso Colombiano (COP)</option>
                  <option value="ARS">🇦🇷 Peso Argentino (ARS)</option>
                  <option value="CLP">🇨🇱 Peso Chileno (CLP)</option>
                  <option value="BTC">₿ Bitcoin (BTC)</option>
                  <option value="ETH">Ξ Ethereum (ETH)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Saldo actual</label>
                <input type="number" step="0.01" className="input-dark" placeholder="$0.00"
                  value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
              </div>
              {form.type === "CREDIT_CARD" && (
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#EF4444" }}>Límite de crédito</label>
                  <input type="number" step="0.01" min="0" className="input-dark" placeholder="Ej: 50000"
                    value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Creando..." : "Crear Cartera"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="py-2.5 px-6 rounded-xl font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wallet Cards */}
      {wallets.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏦</div>
          <div className="text-xl font-semibold text-white mb-2">Sin carteras aún</div>
          <p style={{ color: "#64748B" }} className="mb-6">Agrega tus cuentas bancarias, de inversión y más</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Crear mi primera cartera</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {wallets.map((wallet) => {
            const wt = getWalletType(wallet.type)
            return (
              <div key={wallet.id} className="glass-card rounded-2xl p-5"
                style={{ borderColor: `${wallet.color}25` }}>
                {editing === wallet.id && editForm ? (
                  <div className="space-y-3">
                    <input className="input-dark text-sm" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <select className="input-dark text-sm" value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                      {WALLET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                    <input className="input-dark text-sm" placeholder="Banco" value={editForm.bank}
                      onChange={(e) => setEditForm({ ...editForm, bank: e.target.value })} />
                    <input type="number" className="input-dark text-sm" placeholder="Saldo" value={editForm.balance}
                      onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(wallet.id)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                        style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                        <Check size={13} /> Guardar
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}>
                        <X size={13} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: `${wallet.color}20` }}>
                          {wt.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-white leading-tight">{wallet.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                            {wallet.bank && `${wallet.bank} · `}{wt.label} · <span style={{ color: wallet.color }}>{wallet.currency}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => {
                          setEditing(wallet.id)
                          setEditForm({ name: wallet.name, type: wallet.type, bank: wallet.bank || "", balance: String(wallet.balance), currency: wallet.currency, color: wallet.color, creditLimit: wallet.creditLimit ? String(wallet.creditLimit) : "" })
                        }} className="p-1.5 rounded-lg" style={{ color: "#6366F1", background: "rgba(99,102,241,0.1)" }}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => handleDelete(wallet.id)} className="btn-danger p-1.5">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className={`text-3xl font-bold mb-1 ${wallet.type === "CREDIT_CARD" ? "text-red-400" : "text-white"}`}>
                      <MaskedAmount
                        amount={wallet.type === "CREDIT_CARD" ? Math.abs(wallet.balance) : wallet.balance}
                        currency={wallet.currency}
                      />
                    </div>
                    {wallet.type === "CREDIT_CARD" && wallet.creditLimit ? (() => {
                      const used = Math.abs(wallet.balance)
                      const pct = Math.min(100, (used / wallet.creditLimit) * 100)
                      const available = wallet.creditLimit - used
                      const barColor = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F97316" : "#3B82F6"
                      return (
                        <div className="mt-2 mb-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: "#94A3B8" }}>Uso: {pct.toFixed(0)}%</span>
                            <span style={{ color: "#64748B" }}>Límite: <MaskedAmount amount={wallet.creditLimit} currency={wallet.currency} /></span>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <div className="text-xs mt-1" style={{ color: "#64748B" }}>
                            Disponible: <MaskedAmount amount={available} currency={wallet.currency} />
                          </div>
                        </div>
                      )
                    })() : wallet.type === "CREDIT_CARD" ? (
                      <div className="text-xs text-red-400 mt-1">Saldo adeudado</div>
                    ) : null}

                    <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-xs" style={{ color: "#64748B" }}>
                        {wallet.transactions.length} movimiento{wallet.transactions.length !== 1 ? "s" : ""}
                      </div>
                      <Link href={`/carteras/${wallet.id}`}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                        style={{ background: `${wallet.color}15`, color: wallet.color }}>
                        Ver detalle <ChevronRight size={12} />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowLeftRight size={18} style={{ color: "#6366F1" }} /> Últimas Transferencias
          </h2>
          <div className="space-y-2">
            {transfers.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "var(--bg-hover)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: "rgba(99,102,241,0.15)" }}>
                    ↔
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">
                      {t.fromWallet.name} → {t.toWallet.name}
                    </div>
                    <div className="text-xs" style={{ color: "#64748B" }}>
                      {t.description || formatDate(t.date)}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-indigo-400"><MaskedAmount amount={t.amount} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
