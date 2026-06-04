"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Loader2, CheckCircle2 } from "lucide-react"

interface Category { id: string; name: string; color: string }
interface Wallet { id: string; name: string; currency: string }

export default function QuickExpenseForm() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [walletId, setWalletId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/wallets").then((r) => r.json()),
      fetch("/api/categories?type=expense").then((r) => r.json()),
    ])
      .then(([ws, cats]: [Wallet[], Category[]]) => {
        setWallets(ws)
        if (ws.length > 0) setWalletId(ws[0].id)
        setCategories(cats)
        if (cats.length > 0) setCategory(cats[0].name)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !category) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          amount: parseFloat(amount),
          description: description || null,
          category,
          walletId: walletId || null,
          date: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        setAmount("")
        setDescription("")
        setCategory(categories.length > 0 ? categories[0].name : "")
        if (wallets.length > 0) setWalletId(wallets[0].id)
        setSuccess(true)
        router.refresh()
        if (successTimer.current) clearTimeout(successTimer.current)
        successTimer.current = setTimeout(() => setSuccess(false), 3000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    background: "var(--bg-tertiary)",
    border: "1px solid rgba(16,185,129,0.15)",
    color: "#F1F5F9",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
  }

  return (
    <div className="p-5 rounded-xl" style={{ background: "var(--bg-tertiary)", border: "1px solid rgba(16,185,129,0.15)" }}>
      <div className="flex items-center gap-2 mb-4">
        <PlusCircle size={18} style={{ color: "#10B981" }} />
        <h2 className="text-sm font-semibold text-white">Gasto Rápido</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Monto */}
          <div className="col-span-1">
            <label className="block text-xs mb-1" style={{ color: "#64748B" }}>Monto</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Concepto */}
          <div className="col-span-1">
            <label className="block text-xs mb-1" style={{ color: "#64748B" }}>Concepto</label>
            <input
              type="text"
              placeholder="Café, taxi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Categoría */}
          <div className="col-span-1">
            <label className="block text-xs mb-1" style={{ color: "#64748B" }}>Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
              disabled={categories.length === 0}
            >
              {categories.length === 0
                ? <option value="">Cargando...</option>
                : categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
            </select>
          </div>

          {/* Cartera */}
          <div className="col-span-1">
            <label className="block text-xs mb-1" style={{ color: "#64748B" }}>Cartera</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              style={inputStyle}
              disabled={wallets.length === 0}
            >
              {wallets.length === 0
                ? <option value="">Sin carteras</option>
                : wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
            </select>
          </div>
        </div>

        {/* Botón + feedback */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="submit"
            disabled={submitting || !amount || !walletId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: submitting || !amount || !walletId ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg,#059669,#10B981)",
              color: "white",
              cursor: submitting || !amount || !walletId ? "not-allowed" : "pointer",
            }}
          >
            {submitting
              ? <Loader2 size={15} className="animate-spin" />
              : <PlusCircle size={15} />}
            Registrar gasto
          </button>

          {success && (
            <div className="flex items-center gap-1 text-sm" style={{ color: "#10B981" }}>
              <CheckCircle2 size={15} />
              <span>¡Registrado!</span>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
