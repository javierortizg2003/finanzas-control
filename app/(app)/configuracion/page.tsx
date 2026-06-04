"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Settings, Sun, Moon, DollarSign, Bell, Lock, HelpCircle, Save, CheckCircle2, User } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"

export default function ConfiguracionPage() {
  const { user } = useUser()
  const firstName = user?.firstName ?? user?.username ?? "Usuario"

  const [theme,         setTheme]         = useState<"dark" | "light">("dark")
  const [currency,      setCurrency]      = useState("MXN")
  const [notifications, setNotifications] = useState(true)
  const [language,      setLanguage]      = useState("es")
  const [autoSave,      setAutoSave]      = useState(true)
  const [decimalPlaces, setDecimalPlaces] = useState("2")
  const [saved,         setSaved]         = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null
    setTheme(stored ?? "dark")
    setCurrency(localStorage.getItem("currency") ?? "MXN")
    setNotifications(localStorage.getItem("notifications") !== "false")
    setLanguage(localStorage.getItem("language") ?? "es")
    setAutoSave(localStorage.getItem("autoSave") !== "false")
    setDecimalPlaces(localStorage.getItem("decimalPlaces") ?? "2")
  }, [])

  const handleSave = () => {
    localStorage.setItem("theme",         theme)
    localStorage.setItem("currency",      currency)
    localStorage.setItem("notifications", notifications.toString())
    localStorage.setItem("language",      language)
    localStorage.setItem("autoSave",      autoSave.toString())
    localStorage.setItem("decimalPlaces", decimalPlaces)
    document.documentElement.classList.toggle("light", theme === "light")
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header with welcome */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Settings style={{ color: "#6366F1" }} size={28} />
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
        </div>
        <p style={{ color: "#64748B" }} className="mt-1">Personaliza tu experiencia en FinanzasControl</p>
      </div>

      {/* Welcome card */}
      <div className="glass-card rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#059669,#10B981)" }}>
          <User size={22} className="text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">Bienvenido, {firstName}</p>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            {user?.primaryEmailAddress?.emailAddress ?? ""}
          </p>
        </div>
      </div>

      <div className="space-y-5">

        {/* Tema */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)" }}>
              {theme === "dark"
                ? <Moon size={18} style={{ color: "#6366F1" }} />
                : <Sun size={18} style={{ color: "#F59E0B" }} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Apariencia</h2>
              <p style={{ color: "#64748B" }} className="text-sm">Elige entre modo claro u oscuro</p>
            </div>
          </div>
          <div className="flex gap-3">
            {([
              { key: "dark"  as const, label: "Modo Oscuro", Icon: Moon,  accent: "#6366F1" },
              { key: "light" as const, label: "Modo Claro",  Icon: Sun,   accent: "#F59E0B" },
            ]).map(({ key, label, Icon, accent }) => (
              <button key={key} onClick={() => setTheme(key)}
                className="flex-1 flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                style={{
                  background: theme === key ? `${accent}20` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${theme === key ? `${accent}50` : "rgba(255,255,255,0.07)"}`,
                }}>
                <Icon size={18} style={{ color: theme === key ? accent : "#64748B" }} />
                <span className="text-sm font-medium" style={{ color: theme === key ? "white" : "#94A3B8" }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Moneda y Formato */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <DollarSign size={18} style={{ color: "#10B981" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Moneda y Formato</h2>
              <p style={{ color: "#64748B" }} className="text-sm">Configura cómo se muestran los números</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#94A3B8" }}>Moneda</label>
              <select className="input-dark w-full" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="ARS">Peso Argentino (ARS)</option>
                <option value="CLP">Peso Chileno (CLP)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#94A3B8" }}>Decimales</label>
              <select className="input-dark w-full" value={decimalPlaces} onChange={(e) => setDecimalPlaces(e.target.value)}>
                <option value="0">Sin decimales (1,000)</option>
                <option value="1">1 decimal (1,000.0)</option>
                <option value="2">2 decimales (1,000.00)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
            Ejemplo: <span className="font-semibold" style={{ color: "#10B981" }}>
              ${(1234.5).toFixed(parseInt(decimalPlaces))} {currency}
            </span>
          </div>
        </div>

        {/* Toggles */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          {([
            {
              key: "notifications", label: "Notificaciones", Icon: Bell, color: "#EF4444",
              desc: notifications ? "Recibirás alertas sobre gastos y metas" : "Notificaciones desactivadas",
              value: notifications, toggle: () => setNotifications((v) => !v),
            },
            {
              key: "autoSave", label: "Auto-guardado", Icon: Lock, color: "#6366F1",
              desc: autoSave ? "Tus cambios se guardan automáticamente" : "Debes guardar manualmente",
              value: autoSave, toggle: () => setAutoSave((v) => !v),
            },
          ]).map(({ label, Icon, color, desc, value, toggle }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{desc}</p>
                </div>
              </div>
              <button onClick={toggle}
                className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 mt-1"
                style={{ background: value ? "#10B981" : "#334155" }}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Idioma */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.15)" }}>
              <HelpCircle size={18} style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Idioma</h2>
              <p style={{ color: "#64748B" }} className="text-sm">Selecciona tu idioma preferido</p>
            </div>
          </div>
          <select className="input-dark w-full md:w-64" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Save + Reset */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => {
            if (confirm("¿Resetear todas las configuraciones?")) {
              localStorage.clear()
              window.location.reload()
            }
          }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            Resetear
          </button>

          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "white" }}>
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saved ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}
