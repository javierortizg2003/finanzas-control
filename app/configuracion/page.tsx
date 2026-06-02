"use client"

import { useEffect, useState } from "react"
import { Settings, Sun, Moon, DollarSign, Bell, Lock, HelpCircle } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"

export default function ConfiguracionPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [currency, setCurrency] = useState("MXN")
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState("es")
  const [autoSave, setAutoSave] = useState(true)
  const [decimalPlaces, setDecimalPlaces] = useState("2")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null
    setTheme(stored ?? "dark")
    setCurrency(localStorage.getItem("currency") ?? "MXN")
    setNotifications(localStorage.getItem("notifications") !== "false")
    setLanguage(localStorage.getItem("language") ?? "es")
    setAutoSave(localStorage.getItem("autoSave") !== "false")
    setDecimalPlaces(localStorage.getItem("decimalPlaces") ?? "2")
  }, [])

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("light", newTheme === "light")
  }

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency)
    localStorage.setItem("currency", newCurrency)
  }

  const handleToggleSetting = (key: string, value: boolean) => {
    localStorage.setItem(key, value.toString())
    if (key === "notifications") setNotifications(value)
    if (key === "autoSave") setAutoSave(value)
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    localStorage.setItem("language", newLang)
  }

  const handleDecimalPlacesChange = (places: string) => {
    setDecimalPlaces(places)
    localStorage.setItem("decimalPlaces", places)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings style={{ color: "#6366F1" }} /> Configuración
        </h1>
        <p style={{ color: "#64748B" }} className="mt-1">Personaliza tu experiencia en FinanzasControl</p>
      </div>

      <div className="space-y-6">
        {/* Tema */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(100,102,241,0.15)" }}>
              {theme === "dark" ? <Moon size={18} style={{ color: "#6366F1" }} /> : <Sun size={18} style={{ color: "#F59E0B" }} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Apariencia</h2>
              <p style={{ color: "#64748B" }} className="text-sm">Elige entre modo claro u oscuro</p>
            </div>
          </div>

          <div className="flex gap-4 mt-5">
            {([
              { key: "dark", label: "🌙 Modo Oscuro", desc: "Tema oscuro con colores suaves" },
              { key: "light", label: "☀️ Modo Claro", desc: "Tema claro y luminoso" },
            ] as const).map(({ key, label, desc }) => (
              <button key={key} onClick={() => handleThemeChange(key)}
                className="flex-1 p-4 rounded-xl text-left transition-all"
                style={{
                  background: theme === key ? (key === "dark" ? "rgba(99,102,241,0.2)" : "rgba(245,158,11,0.2)") : "rgba(6,13,31,0.3)",
                  border: theme === key ? `2px solid ${key === "dark" ? "#6366F1" : "#F59E0B"}` : "1px solid rgba(255,255,255,0.06)",
                }}>
                <div className="font-medium text-white">{label}</div>
                <div className="text-xs mt-1" style={{ color: "#64748B" }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Moneda y Formato */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <DollarSign size={18} style={{ color: "#10B981" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Moneda y Formato</h2>
              <p style={{ color: "#64748B" }} className="text-sm">Configura cómo se muestran los números</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#94A3B8" }}>Moneda</label>
              <select className="input-dark w-full" value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
                <option value="MXN">🇲🇽 Peso Mexicano (MXN) $</option>
                <option value="USD">🇺🇸 Dólar Estadounidense (USD) $</option>
                <option value="EUR">🇪🇺 Euro (EUR) €</option>
                <option value="COP">🇨🇴 Peso Colombiano (COP) $</option>
                <option value="ARG">🇦🇷 Peso Argentino (ARS) $</option>
                <option value="CLP">🇨🇱 Peso Chileno (CLP) $</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#94A3B8" }}>Decimales</label>
              <select className="input-dark w-full" value={decimalPlaces} onChange={(e) => handleDecimalPlacesChange(e.target.value)}>
                <option value="0">Sin decimales (1000)</option>
                <option value="1">1 decimal (1000.0)</option>
                <option value="2">2 decimales (1000.00)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.1)" }}>
            <div className="text-sm text-white">Ejemplo: <span style={{ color: "#10B981" }}>$1,234.50 MXN</span></div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <Bell size={18} style={{ color: "#EF4444" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
                <p style={{ color: "#64748B" }} className="text-sm">Recibe alertas sobre tu situación financiera</p>
              </div>
            </div>
            <button onClick={() => handleToggleSetting("notifications", !notifications)}
              className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
              style={{ background: notifications ? "#10B981" : "#475569" }}>
              <span className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${notifications ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="text-xs" style={{ color: "#64748B" }}>
            {notifications ? "✓ Recibirás notificaciones sobre gastos elevados, metas alcanzadas y recordatorios" : "Las notificaciones están desactivadas"}
          </div>
        </div>

        {/* Auto-guardado */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(100,102,241,0.15)" }}>
                <Lock size={18} style={{ color: "#6366F1" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Auto-guardado</h2>
                <p style={{ color: "#64748B" }} className="text-sm">Guarda automáticamente tus cambios</p>
              </div>
            </div>
            <button onClick={() => handleToggleSetting("autoSave", !autoSave)}
              className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
              style={{ background: autoSave ? "#10B981" : "#475569" }}>
              <span className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${autoSave ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="text-xs" style={{ color: "#64748B" }}>
            {autoSave ? "✓ Tus cambios se guardan automáticamente" : "Debes guardar manualmente los cambios"}
          </div>
        </div>

        {/* Idioma */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.15)" }}>
              <HelpCircle size={18} style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Idioma</h2>
              <p style={{ color: "#64748B" }} className="text-sm">Selecciona tu idioma preferido</p>
            </div>
          </div>

          <select className="input-dark w-full md:w-64" value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
            <option value="es">🇲🇽 Español</option>
            <option value="en">🇺🇸 English</option>
          </select>
          <div className="text-xs mt-2" style={{ color: "#64748B" }}>Nota: El cambio de idioma se aplicará en la próxima carga</div>
        </div>

        {/* Info */}
        <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex gap-3">
            <div className="text-lg mt-0.5">ℹ️</div>
            <div>
              <div className="text-sm font-semibold text-white">Tus datos se guardan localmente</div>
              <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                Todas tus configuraciones se almacenan en tu navegador. No compartimos información personal.
                Los datos de tu aplicación se guardan en una base de datos segura.
              </div>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={() => {
            if (confirm("¿Resetear todas las configuraciones a los valores por defecto?")) {
              localStorage.clear()
              window.location.reload()
            }
          }}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            Resetear configuración
          </button>
        </div>
      </div>
    </div>
  )
}
