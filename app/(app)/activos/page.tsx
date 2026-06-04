import { Landmark, Plus, Home, Car, Package } from "lucide-react"

const ASSET_TYPES = [
  { value: "REAL_ESTATE", label: "Bien Raíz",  icon: Home,    color: "#10B981", desc: "Casas, departamentos, terrenos" },
  { value: "VEHICLE",     label: "Vehículo",    icon: Car,     color: "#3B82F6", desc: "Autos, motos, embarcaciones"  },
  { value: "OTHER",       label: "Otro",        icon: Package, color: "#8B5CF6", desc: "Arte, joyería, equipo, etc."  },
]

export default function ActivosPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Landmark style={{ color: "#10B981" }} /> Mi Patrimonio
          </h1>
          <p className="mt-1" style={{ color: "#64748B" }}>
            Registra y controla tus bienes patrimoniales: propiedades, vehículos y otros activos.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "white" }}>
          <Plus size={16} /> Agregar Activo
        </button>
      </div>

      {/* Categorías de activos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {ASSET_TYPES.map(({ value, label, icon: Icon, color, desc }) => (
          <div key={value} className="p-5 rounded-2xl"
            style={{ background: "var(--bg-tertiary)", border: `1px solid ${color}25` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{label}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>{desc}</div>
              </div>
            </div>
            <div className="text-2xl font-bold mt-3" style={{ color }}>$0</div>
            <div className="text-xs mt-1" style={{ color: "#475569" }}>0 activos registrados</div>
          </div>
        ))}
      </div>

      {/* Estado vacío */}
      <div className="text-center py-16 rounded-2xl"
        style={{ background: "var(--bg-hover)", border: "1px dashed rgba(16,185,129,0.2)" }}>
        <div className="text-5xl mb-4">🏛️</div>
        <div className="text-xl font-semibold text-white mb-2">Sin activos registrados</div>
        <p className="mb-6 text-sm max-w-sm mx-auto" style={{ color: "#64748B" }}>
          Agrega tus bienes patrimoniales para tener una visión completa de tu riqueza neta.
        </p>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "white" }}>
          <Plus size={16} /> Agregar mi primer activo
        </button>
      </div>
    </div>
  )
}
