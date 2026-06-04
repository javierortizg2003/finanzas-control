"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Loader2, CheckCircle2 } from "lucide-react"

const EXPENSE_CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Restaurantes",
  "Entretenimiento",
  "Servicios",
  "Salud",
  "Ropa",
  "Educación",
  "Suscripciones",
  "Vivienda",
  "Viajes",
  "Mascotas",
  "Deudas",
  "Otros",
]

interface Wallet {
  id: string
  name: string
  currency: string
}

export default function QuickExpenseForm() {
  const router = useRouter()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [walletId, setWalletId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((data: Wallet[]) => {
        setWallets(data)
        if (data.length > 0) setWalletId(data[0].id)
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
        setCategory(EXPENSE_CATEGORIES[0])
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
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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
            disabled={submitting || !amount}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: submitting || !amount ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg,#059669,#10B981)",
              color: "white",
              cursor: submitting || !amount ? "not-allowed" : "pointer",
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
