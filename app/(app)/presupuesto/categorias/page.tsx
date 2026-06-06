"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Settings2, Plus, Trash2, Check, X, Pencil, Home, Sparkles, PiggyBank, HelpCircle } from "lucide-react"

interface Category { id: string; name: string; color: string; macro?: string | null; type: string }

const MACROS = ["Necesidades", "Deseos", "Ahorro/Inversión"]

const MACRO_META: Record<string, { color: string; bg: string; Icon: React.ElementType }> = {
  "Necesidades":      { color: "#10B981", bg: "rgba(16,185,129,0.15)",  Icon: Home      },
  "Deseos":           { color: "#6366F1", bg: "rgba(99,102,241,0.15)",  Icon: Sparkles  },
  "Ahorro/Inversión": { color: "#F59E0B", bg: "rgba(245,158,11,0.15)",  Icon: PiggyBank },
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#A855F7",
  "#F472B6", "#14B8A6", "#DC2626", "#7C3AED", "#EA580C", "#0EA5E9",
  "#84CC16", "#94A3B8", "#10B981", "#6366F1", "#F59E0B", "#EC4899",
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
            style={{ background: c, borderColor: value === c ? "white" : "transparent" }} />
        ))}
      </div>
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: value }} />
        <span className="text-xs" style={{ color: "#64748B" }}>Color personalizado</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-0 h-0 opacity-0 absolute" />
      </label>
    </div>
  )
}

export default function CategoriasPage() {
  const [tab, setTab] = useState<"expense" | "income">("expense")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", color: "", macro: "" })
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", color: "#94A3B8", macro: "Necesidades" })
  const [creating, setCreating] = useState(false)

  const MACRO_ORDER = ["Necesidades", "Deseos", "Ahorro/Inversión", ""]

  const fetchCats = async (type: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/categories?type=${type}`)
      const data: Category[] = await res.json()
      const sorted = type === "expense"
        ? [...data].sort((a, b) => {
            const ai = MACRO_ORDER.indexOf(a.macro ?? "")
            const bi = MACRO_ORDER.indexOf(b.macro ?? "")
            return ai !== bi ? ai - bi : a.name.localeCompare(b.name, "es")
          })
        : [...data].sort((a, b) => a.name.localeCompare(b.name, "es"))
      setCategories(sorted)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchCats(tab) }, [tab])

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, color: cat.color, macro: cat.macro ?? "" })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return
    setSaving(true)
    try {
      const body: Record<string, string | null> = { name: editForm.name, color: editForm.color }
      if (tab === "expense") body.macro = editForm.macro || null
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) { setEditingId(null); fetchCats(tab) }
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Los registros existentes mantendrán esta etiqueta.`)) return
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    fetchCats(tab)
  }

  const handleCreate = async () => {
    if (!newForm.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name.trim(), type: tab, color: newForm.color,
          macro: tab === "expense" ? newForm.macro : undefined,
        }),
      })
      if (res.ok) {
        setNewForm({ name: "", color: "#94A3B8", macro: "Necesidades" })
        setShowNew(false)
        fetchCats(tab)
      } else {
        const err = await res.json(); alert(err.error || "Error al crear")
      }
    } finally { setCreating(false) }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#F1F5F9",
    outline: "none",
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/presupuesto"
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl shrink-0 mt-1 transition-colors"
          style={{ color: "#94A3B8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings2 size={22} style={{ color: "#F59E0B" }} /> Personalizar Categorías
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Crea, edita, cambia de grupo o elimina tus categorías
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "expense", label: "Gastos",   color: "#EF4444" },
          { key: "income",  label: "Ingresos", color: "#10B981" },
        ] as const).map(({ key, label, color }) => (
          <button key={key} onClick={() => { setTab(key); setEditingId(null); setShowNew(false) }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === key ? `${color}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${tab === key ? `${color}45` : "rgba(255,255,255,0.07)"}`,
              color: tab === key ? color : "#94A3B8",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {categories.map((cat) =>
              editingId === cat.id ? (
                /* ─── Edit row ─── */
                <div key={cat.id} className="p-4 space-y-3 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(99,102,241,0.06)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#818CF8" }}>Editando: {cat.name}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border-2 border-white/20 shrink-0"
                      style={{ background: editForm.color }} />
                    <input type="text" autoFocus
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg"
                      style={inputStyle}
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()} />
                  </div>
                  <ColorPicker value={editForm.color} onChange={(c) => setEditForm({ ...editForm, color: c })} />
                  {tab === "expense" && (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Grupo presupuestal</label>
                      <select value={editForm.macro}
                        onChange={(e) => setEditForm({ ...editForm, macro: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg"
                        style={inputStyle}>
                        {MACROS.map((m) => <option key={m} value={m}>{m}</option>)}
                        <option value="">Sin clasificar</option>
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                      <Check size={13} /> Guardar
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: "rgba(100,116,139,0.15)", color: "#94A3B8" }}>
                      <X size={13} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Display row ─── */
                <div key={cat.id}
                  className="flex items-center gap-3 px-3 py-2.5 border-b transition-colors group"
                  style={{ borderColor: "rgba(255,255,255,0.04)", background: `${cat.color}08` }}>
                  {/* Color accent bar */}
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: cat.color }} />
                  {/* Color swatch */}
                  <div className="w-7 h-7 rounded-lg shrink-0 border border-white/10 shadow-sm"
                    style={{ background: cat.color }} />
                  <span className="flex-1 text-sm font-medium text-white">{cat.name}</span>
                  {tab === "expense" && (() => {
                    const m = cat.macro ? MACRO_META[cat.macro] : null
                    const Icon = m?.Icon ?? HelpCircle
                    return (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                        style={m
                          ? { background: m.bg, color: m.color }
                          : { background: "rgba(239,68,68,0.1)", color: "#F87171" }}>
                        <Icon size={11} />
                        {cat.macro ?? "Sin clasificar"}
                      </span>
                    )
                  })()}
                  <button onClick={() => startEdit(cat)} title="Editar"
                    className="p-1.5 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8" }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(cat.id, cat.name)} title="Eliminar"
                    className="p-1.5 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#F87171" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            )}

            {/* New category */}
            {showNew ? (
              <div className="p-4 space-y-3" style={{ background: "rgba(245,158,11,0.04)" }}>
                <p className="text-xs font-semibold" style={{ color: "#F59E0B" }}>Nueva categoría</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border-2 border-white/20 shrink-0"
                    style={{ background: newForm.color }} />
                  <input type="text" autoFocus placeholder="Nombre..."
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg"
                    style={inputStyle}
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
                </div>
                <ColorPicker value={newForm.color} onChange={(c) => setNewForm({ ...newForm, color: c })} />
                {tab === "expense" && (
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Grupo presupuestal</label>
                    <select value={newForm.macro}
                      onChange={(e) => setNewForm({ ...newForm, macro: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg"
                      style={inputStyle}>
                      {MACROS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={creating || !newForm.name.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                    <Plus size={13} /> {creating ? "Creando..." : "Crear"}
                  </button>
                  <button onClick={() => { setShowNew(false); setNewForm({ name: "", color: "#94A3B8", macro: "Necesidades" }) }}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(100,116,139,0.15)", color: "#94A3B8" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl w-full transition-colors"
                  style={{ color: "#F59E0B", background: "rgba(245,158,11,0.05)", border: "1px dashed rgba(245,158,11,0.3)" }}>
                  <Plus size={15} /> Nueva categoría
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
