"use client"

import { useState, useEffect, useCallback } from "react"
import { Landmark, Plus, Home, Car, Package, Trash2, X, Pencil } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type AssetType = "REAL_ESTATE" | "VEHICLE" | "OTHER"

interface Asset {
  id: string
  name: string
  type: AssetType
  currentValue: number
  description: string | null
  createdAt: string
}

const ASSET_TYPES = [
  { value: "REAL_ESTATE" as AssetType, label: "Bien Raíz",  icon: Home,    color: "#10B981", desc: "Casas, departamentos, terrenos" },
  { value: "VEHICLE"     as AssetType, label: "Vehículo",    icon: Car,     color: "#3B82F6", desc: "Autos, motos, embarcaciones"  },
  { value: "OTHER"       as AssetType, label: "Otro",        icon: Package, color: "#8B5CF6", desc: "Arte, joyería, equipo, etc."  },
]

function assetType(type: AssetType) {
  return ASSET_TYPES.find(a => a.value === type) ?? ASSET_TYPES[2]
}

const EMPTY_FORM = { name: "", type: "REAL_ESTATE" as AssetType, currentValue: "", description: "" }

export default function ActivosPage() {
  const [assets, setAssets]       = useState<Asset[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assets")
      if (res.ok) setAssets(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function openEdit(a: Asset) {
    setEditId(a.id)
    setForm({ name: a.name, type: a.type, currentValue: String(a.currentValue), description: a.description ?? "" })
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, currentValue: parseFloat(form.currentValue) }
      const url    = editId ? `/api/assets/${editId}` : "/api/assets"
      const method = editId ? "PATCH" : "POST"
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) { setError("Error al guardar el activo"); return }
      setShowForm(false)
      load()
    } catch {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este activo?")) return
    await fetch(`/api/assets/${id}`, { method: "DELETE" })
    load()
  }

  const totals = ASSET_TYPES.map(t => ({
    ...t,
    count: assets.filter(a => a.type === t.value).length,
    total: assets.filter(a => a.type === t.value).reduce((s, a) => s + a.currentValue, 0),
  }))

  const grandTotal = assets.reduce((s, a) => s + a.currentValue, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Landmark style={{ color: "#10B981" }} /> Mi Patrimonio
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Registra y controla tus bienes patrimoniales: propiedades, vehículos y otros activos.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "white" }}>
          <Plus size={16} /> Agregar Activo
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {totals.map(({ value, label, icon: Icon, color, desc, count, total }) => (
          <div key={value} className="p-5 rounded-2xl"
            style={{ background: "var(--bg-tertiary)", border: `1px solid ${color}25` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{label}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>{desc}</div>
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color }}>{formatCurrency(total)}</div>
            <div className="text-xs mt-1" style={{ color: "#475569" }}>{count} {count === 1 ? "activo" : "activos"} registrado{count !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      {/* Grand total */}
      {assets.length > 0 && (
        <div className="mb-8 p-4 rounded-xl flex items-center justify-between"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <span className="font-semibold text-white">Total Activos</span>
          <span className="text-2xl font-bold" style={{ color: "#10B981" }}>{formatCurrency(grandTotal)}</span>
        </div>
      )}

      {/* Asset list */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: "#64748B" }}>Cargando activos…</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: "var(--bg-hover)", border: "1px dashed rgba(16,185,129,0.2)" }}>
          <div className="text-5xl mb-4">🏛️</div>
          <div className="text-xl font-semibold text-white mb-2">Sin activos registrados</div>
          <p className="mb-6 text-sm max-w-sm mx-auto" style={{ color: "#64748B" }}>
            Agrega tus bienes patrimoniales para tener una visión completa de tu riqueza neta.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "white" }}>
            <Plus size={16} /> Agregar mi primer activo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map(a => {
            const { icon: Icon, color, label } = assetType(a.type)
            return (
              <div key={a.id} className="p-4 rounded-2xl flex items-center gap-4"
                style={{ background: "var(--bg-tertiary)", border: `1px solid ${color}18` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}18` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{a.name}</div>
                  <div className="text-xs" style={{ color: "#64748B" }}>{label}{a.description ? ` · ${a.description}` : ""}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-white">{formatCurrency(a.currentValue)}</div>
                </div>
                <button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Editar">
                  <Pencil size={15} style={{ color: "#64748B" }} />
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Eliminar">
                  <Trash2 size={15} style={{ color: "#EF4444" }} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Activo" : "Nuevo Activo"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X size={18} style={{ color: "#64748B" }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Nombre</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ej. Casa en Guadalajara"
                  className="input-dark w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as AssetType }))}
                  className="input-dark w-full">
                  {ASSET_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Valor actual (MXN)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentValue}
                  onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
                  placeholder="0.00"
                  className="input-dark w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Descripción (opcional)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detalles adicionales"
                  className="input-dark w-full"
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#94A3B8" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "white" }}>
                  {saving ? "Guardando…" : editId ? "Guardar cambios" : "Agregar activo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
