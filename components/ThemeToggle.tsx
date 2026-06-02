"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null
    const initial = stored ?? "dark"
    setTheme(initial)
    document.documentElement.classList.toggle("light", initial === "light")
  }, [])

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("light", next === "light")
  }

  const isDark = theme === "dark"

  if (compact) {
    return (
      <button onClick={toggle}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}
        title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    )
  }

  return (
    <button onClick={toggle}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{ background: "rgba(255,255,255,0.04)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)" }}>
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Modo Claro" : "Modo Oscuro"}
    </button>
  )
}
