"use client"

import { useEffect, useState, useMemo } from "react"
import { Target, Plus, Trash2, Edit3, Check, X, Trophy, PlusCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"

interface Goal {
  id: string; name: string; description: string | null
  targetAmount: number; currentAmount: number
  deadline: string | null; category: string | null; color: string
  createdAt: string
}

const GOAL_COLORS = [
  "#10B981", "#6366F1", "#F59E0B", "#EC4899",
  "#14B8A6", "#EF4444", "#8B5CF6", "#F97316",
]

const GOAL_CATEGORIES = [
  "Viaje", "Educación", "Vivienda", "Auto", "Fondo de Emergencia",
  "Retiro", "Negocio", "Tecnología", "Salud", "Otro",
]

function monthsUntil(deadline: string | null): number | null {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  const months = diff / (1000 * 60 * 60 * 24 * 30.44)
  return Math.max(0, Math.ceil(months))
}

function monthlyNeeded(target: number, current: number, deadline: string | null): number | null {
  const months = monthsUntil(deadline)
  if (!months || months <= 0) return null
  const remaining = target - current
  if (remaining <= 0) return 0
  return remaining / months
}

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [depositing, setDepositing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [depositAmount, setDepositAmount] = useState("")
  const [form, setForm] = useState({
    name: "", description: "", targetAmount: "", currentAmount: "0",
    deadline: "", category: GOAL_CATEGORIES[0], color: GOAL_COLORS[0],
  })
  const [editForm, setEditForm] = useState<typeof form | null>(null)

  const fetchData = () => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(setGoals)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // Real-time monthly calculation for the creation form
  const formMonthly = useMemo(
    () => monthlyNeeded(
      parseFloat(form.targetAmount) || 0,
      parseFloat(form.currentAmount) || 0,
      form.deadline || null
    ),
    [form.targetAmount, form.currentAmount, form.deadline]
  )
  const formMonthsLeft = useMemo(() => monthsUntil(form.deadline || null), [form.deadline])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) return
    setSubmitting(true)
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }),
      })
      setForm({ name: "", description: "", targetAmount: "", currentAmount: "0", deadline: "", category: GOAL_CATEGORIES[0], color: GOAL_COLORS[0] })
      setShowForm(false)
      fetchData()
    } finally { setSubmitting(false) }
  }

  const handleDeposit = async (id: string) => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return
    setSubmitting(true)
    try {
      await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      setDepositing(null)
      setDepositAmount("")
      fetchData()
    } finally { setSubmitting(false) }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm) return
    await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditing(null)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta meta?")) return
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("No se pudo eliminar la meta. Intenta de nuevo.")
      return
    }
    fetchData()
  }

  const completed = goals.filter((g) => g.currentAmount >= g.targetAmount)
  const active = goals.filter((g) => g.currentAmount < g.targetAmount)

  const getDaysRemaining = (deadline: string | null): string => {
    if (!deadline) return ""
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    if (days < 0) return "Vencida"
    if (days === 0) return "¡Hoy!"
    if (days < 30) return `${days} días`
    const months = Math.ceil(days / 30.44)
    return `${months} ${months === 1 ? "mes" : "meses"}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target style={{ color: "#8B5CF6" }} /> Mis Metas Financieras
          </h1>
          <p style={{ color: "#64748B" }} className="mt-1">Define, deposita y sigue el progreso de tus objetivos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva Meta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Metas activas</div>
          <div className="text-3xl font-bold text-white">{active.length}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Completadas</div>
          <div className="text-3xl font-bold text-emerald-400">{completed.length}</div>
        </div>
        <div className="stat-card p-5">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Por ahorrar</div>
          <div className="text-2xl font-bold text-white">
            <MaskedAmount amount={active.reduce((s, g) => s + Math.max(0, g.targetAmount - g.currentAmount), 0)} />
          </div>
        </div>
      </div>

      {/* Creation Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 mb-8 fade-in">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Plus size={18} style={{ color: "#8B5CF6" }} /> Crear Nueva Meta
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Nombre *</label>
                <input type="text" required className="input-dark" placeholder="Ej: Fondo de emergencia"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Monto objetivo *</label>
                <input type="number" step="0.01" min="0" required className="input-dark" placeholder="$0.00"
                  value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Ya tengo ahorrado</label>
                <input type="number" step="0.01" min="0" className="input-dark" placeholder="$0.00"
                  value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Categoría</label>
                <select className="input-dark" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {GOAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Fecha límite</label>
                <input type="date" className="input-dark" value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Descripción</label>
                <input type="text" className="input-dark" placeholder="Describe tu meta"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Real-time monthly calculation */}
            {formMonthly !== null && parseFloat(form.targetAmount) > 0 && (
              <div className="mb-4 p-4 rounded-xl flex items-center gap-4 flex-wrap"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
                <div className="text-2xl">📅</div>
                <div>
                  {formMonthly === 0 ? (
                    <div className="font-semibold text-emerald-400">¡Ya alcanzaste tu meta con lo que tienes!</div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-white">
                        Para alcanzar{" "}
                        <span style={{ color: "#A78BFA" }}>{formatCurrency(parseFloat(form.targetAmount) || 0)}</span>
                        {form.deadline && (
                          <> en <span style={{ color: "#A78BFA" }}>{formMonthsLeft} {formMonthsLeft === 1 ? "mes" : "meses"}</span></>
                        )}, necesitas ahorrar:
                      </div>
                      <div className="text-3xl font-bold mt-0.5" style={{ color: "#A78BFA" }}>
                        {formatCurrency(formMonthly)}<span className="text-base font-normal" style={{ color: "#7C3AED" }}>/mes</span>
                      </div>
                      {parseFloat(form.currentAmount) > 0 && (
                        <div className="text-xs mt-1" style={{ color: "#64748B" }}>
                          Restante: {formatCurrency(Math.max(0, (parseFloat(form.targetAmount) || 0) - (parseFloat(form.currentAmount) || 0)))} ÷ {formMonthsLeft} meses
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="py-2.5 px-6 rounded-xl font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #7C3AED, #8B5CF6)" }}>
                {submitting ? "Creando..." : "Crear Meta"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="py-2.5 px-6 rounded-xl font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Goals */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">En progreso</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {active.map((goal) => {
              const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
              const remaining = goal.targetAmount - goal.currentAmount
              const monthly = monthlyNeeded(goal.targetAmount, goal.currentAmount, goal.deadline)
              const daysLeft = getDaysRemaining(goal.deadline)
              const isDepositing = depositing === goal.id
              const isEditing = editing === goal.id

              return (
                <div key={goal.id} className="glass-card rounded-2xl p-5 fade-in"
                  style={{ borderColor: `${goal.color}20` }}>
                  {isEditing && editForm ? (
                    <div className="space-y-3">
                      <input className="input-dark text-sm" placeholder="Nombre" value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Meta</label>
                          <input type="number" className="input-dark text-sm" value={editForm.targetAmount}
                            onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Ahorrado</label>
                          <input type="number" className="input-dark text-sm" value={editForm.currentAmount}
                            onChange={(e) => setEditForm({ ...editForm, currentAmount: e.target.value })} />
                        </div>
                      </div>
                      <input type="date" className="input-dark text-sm" value={editForm.deadline}
                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(goal.id)}
                          className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                          style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                          <Check size={14} /> Guardar
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}>
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: `${goal.color}20` }}>🎯</div>
                          <div>
                            <div className="font-semibold text-white">{goal.name}</div>
                            {goal.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                                style={{ background: `${goal.color}20`, color: goal.color }}>
                                {goal.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => {
                            setEditing(goal.id)
                            setEditForm({
                              name: goal.name, description: goal.description || "",
                              targetAmount: String(goal.targetAmount), currentAmount: String(goal.currentAmount),
                              deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
                              category: goal.category || GOAL_CATEGORIES[0], color: goal.color,
                            })
                          }} className="p-1.5 rounded-lg" style={{ color: "#6366F1", background: "rgba(99,102,241,0.1)" }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDelete(goal.id)} className="btn-danger p-1.5">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: "#64748B" }}>Ahorrado</div>
                          <div className="text-2xl font-bold text-white"><MaskedAmount amount={goal.currentAmount} /></div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs mb-0.5" style={{ color: "#64748B" }}>Meta</div>
                          <div className="text-lg font-semibold" style={{ color: "#94A3B8" }}><MaskedAmount amount={goal.targetAmount} /></div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: "#64748B" }}>{progress.toFixed(0)}% completado</span>
                          <span style={{ color: "#64748B" }}>Falta: <MaskedAmount amount={remaining} /></span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${goal.color}cc, ${goal.color})` }} />
                        </div>
                      </div>

                      {/* Monthly needed + deadline */}
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        {monthly !== null && monthly > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{ background: `${goal.color}12`, border: `1px solid ${goal.color}25` }}>
                            <span className="text-xs" style={{ color: "#64748B" }}>Ahorra</span>
                            <span className="text-sm font-bold" style={{ color: goal.color }}>
                              <MaskedAmount amount={monthly} />/mes
                            </span>
                            {goal.deadline && (
                              <span className="text-xs" style={{ color: "#64748B" }}>
                                para cumplirla en {getDaysRemaining(goal.deadline)}
                              </span>
                            )}
                          </div>
                        )}
                        {goal.deadline && !monthly && (
                          <span className="text-xs" style={{ color: "#64748B" }}>
                            ⏰ {daysLeft} · {formatDate(goal.deadline)}
                          </span>
                        )}
                      </div>

                      {goal.description && (
                        <div className="text-xs mb-3" style={{ color: "#64748B" }}>📝 {goal.description}</div>
                      )}

                      {/* Deposit section */}
                      {isDepositing ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number" step="0.01" min="0"
                            className="input-dark text-sm flex-1"
                            placeholder="Monto a depositar"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleDeposit(goal.id)
                              if (e.key === "Escape") { setDepositing(null); setDepositAmount("") }
                            }}
                          />
                          <button onClick={() => handleDeposit(goal.id)} disabled={submitting}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
                            style={{ background: goal.color }}>
                            {submitting ? "..." : "✓ Agregar"}
                          </button>
                          <button onClick={() => { setDepositing(null); setDepositAmount("") }}
                            className="px-3 py-2 rounded-xl text-sm shrink-0"
                            style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setDepositing(goal.id); setDepositAmount("") }}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                          style={{ background: `${goal.color}20`, color: goal.color, border: `1px solid ${goal.color}30` }}>
                          <PlusCircle size={15} />
                          Agregar dinero a esta meta
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={18} style={{ color: "#F59E0B" }} /> Metas Completadas
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map((goal) => (
              <div key={goal.id} className="p-5 rounded-2xl relative overflow-hidden"
                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="absolute top-3 right-10 text-2xl">🏆</div>
                <div className="font-semibold text-white mb-1">{goal.name}</div>
                <div className="text-emerald-400 font-bold text-xl"><MaskedAmount amount={goal.targetAmount} /></div>
                <div className="text-xs mt-2" style={{ color: "#64748B" }}>¡Meta alcanzada!</div>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(16,185,129,0.2)" }}>
                  <div className="h-full w-full rounded-full" style={{ background: "#10B981" }} />
                </div>
                <button onClick={() => handleDelete(goal.id)} className="mt-3 btn-danger p-1.5">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎯</div>
          <div className="text-xl font-semibold text-white mb-2">Sin metas aún</div>
          <p style={{ color: "#64748B" }} className="mb-6">Define tus objetivos financieros — la app te dirá cuánto ahorrar cada mes</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Crear mi primera meta
          </button>
        </div>
      )}
    </div>
  )
}
