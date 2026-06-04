"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, PiggyBank, Zap, Target,
  ArrowUpRight, ArrowDownRight, Lightbulb,
} from "lucide-react"
import { formatCurrency, formatDate, getHealthLabel, FINANCIAL_TIPS } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"
import { usePrivacy } from "@/components/providers/PrivacyProvider"
import QuickExpenseForm from "@/components/QuickExpenseForm"

interface Stats {
  monthlyIncome: number
  monthlyExpenses: number
  totalSavings: number
  savingsRate: number
  healthScore: number
  monthlyData: { month: string; income: number; expenses: number }[]
  savingsDistribution: { name: string; amount: number; color: string }[]
  categoryData: { name: string; value: number; color: string }[]
  recentTransactions: {
    id: string; type: string; amount: number; category: string
    description: string | null; date: string
  }[]
  goalsTotal: number
  goalsCompleted: number
  netWorth: number
  baseCurrency: string
  unconvertedWalletCount: number
}

function StatCard({
  label, value, icon: Icon, color, subtitle, trend,
}: {
  label: string; value: React.ReactNode; icon: React.ElementType
  color: string; subtitle?: string; trend?: "up" | "down"
}) {
  return (
    <div className="stat-card p-5 fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>
            {label}
          </div>
          <div className="text-xl font-bold text-white truncate">{value}</div>
          {subtitle && <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>{subtitle}</div>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center ml-3 shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend === "up" ? (
            <ArrowUpRight size={16} style={{ color: "#10B981" }} />
          ) : (
            <ArrowDownRight size={16} style={{ color: "#EF4444" }} />
          )}
          <span className="text-xs font-medium" style={{ color: trend === "up" ? "#10B981" : "#EF4444" }}>
            {trend === "up" ? "Mejorando" : "Requiere atención"}
          </span>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tip, setTip] = useState("")
  const { isPrivate } = usePrivacy()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
          setTip(FINANCIAL_TIPS[Math.floor(Math.random() * FINANCIAL_TIPS.length)])
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: "#10B981" }} />
          <p style={{ color: "#94A3B8" }}>Cargando tu información financiera...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: "#EF4444" }}>No se pudieron cargar los datos. Intenta nuevamente.</p>
      </div>
    )
  }

  const masked = "•••••"

  return (
    <div className="p-6 space-y-6">
      {/* Gasto rápido */}
      <QuickExpenseForm />

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label="Ingresos este mes"
          value={<MaskedAmount amount={stats.monthlyIncome} />}
          icon={TrendingUp}
          color="#10B981"
          trend="up"
        />
        <StatCard
          label="Gastos este mes"
          value={<MaskedAmount amount={stats.monthlyExpenses} />}
          icon={TrendingDown}
          color="#EF4444"
          trend="down"
        />
        <StatCard
          label="Tasa de ahorro"
          value={isPrivate ? masked : `${stats.savingsRate.toFixed(1)}%`}
          icon={PiggyBank}
          color="#3B82F6"
          subtitle={isPrivate ? undefined : `${stats.savingsRate.toFixed(1)}% del ingreso`}
        />
        <StatCard
          label="Salud financiera"
          value={isPrivate ? masked : `${stats.healthScore.toFixed(0)}/100`}
          icon={Zap}
          color="#F59E0B"
          subtitle={getHealthLabel(stats.healthScore).label}
        />
        <StatCard
          label={`Patrimonio neto (${stats.baseCurrency})`}
          value={<MaskedAmount amount={stats.netWorth} currency={stats.baseCurrency} />}
          icon={Target}
          color="#8B5CF6"
          subtitle={stats.unconvertedWalletCount > 0
            ? `⚠ ${stats.unconvertedWalletCount} cartera(s) excluida(s) por falta de tasa`
            : undefined}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos vs Gastos */}
        <div className="p-5 rounded-lg" style={{ background: "var(--bg-hover)", border: "1px solid rgba(16,185,129,0.1)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Últimos 6 meses</h3>
          {isPrivate ? (
            <div className="flex items-center justify-center h-[250px]" style={{ color: "#475569" }}>
              <span className="text-2xl tracking-widest">•••••</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.monthlyData}>
                <XAxis dataKey="month" stroke="#64748B" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748B" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #10B981" }} />
                <Bar dataKey="income" fill="#10B981" />
                <Bar dataKey="expenses" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribución de ahorros */}
        <div className="p-5 rounded-lg" style={{ background: "var(--bg-hover)", border: "1px solid rgba(16,185,129,0.1)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Distribución de ahorros</h3>
          {isPrivate ? (
            <div className="flex items-center justify-center h-[250px]" style={{ color: "#475569" }}>
              <span className="text-2xl tracking-widest">•••••</span>
            </div>
          ) : stats.savingsDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.savingsDistribution} dataKey="amount" cx="50%" cy="50%" outerRadius={80} label>
                  {stats.savingsDistribution.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #10B981" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#64748B" }} className="text-center py-12">Sin datos de ahorros</p>
          )}
        </div>
      </div>

      {/* Categorías y transacciones recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por categoría */}
        <div className="p-5 rounded-lg" style={{ background: "var(--bg-hover)", border: "1px solid rgba(16,185,129,0.1)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Gastos por categoría</h3>
          <div className="space-y-3">
            {stats.categoryData.length > 0 ? (
              stats.categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                    <span className="text-sm" style={{ color: "#94A3B8" }}>{cat.name}</span>
                  </div>
                  <MaskedAmount amount={cat.value} className="text-sm font-medium text-white" />
                </div>
              ))
            ) : (
              <p style={{ color: "#64748B" }}>Sin gastos registrados</p>
            )}
          </div>
        </div>

        {/* Transacciones recientes */}
        <div className="p-5 rounded-lg" style={{ background: "var(--bg-hover)", border: "1px solid rgba(16,185,129,0.1)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Transacciones recientes</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.05)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.description || tx.category}</p>
                    <p className="text-xs" style={{ color: "#64748B" }}>{formatDate(tx.date)}</p>
                  </div>
                  <span className="text-sm font-semibold ml-3" style={{ color: tx.type === "income" ? "#10B981" : "#EF4444" }}>
                    {isPrivate ? masked : `${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}`}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: "#64748B" }}>Sin transacciones</p>
            )}
          </div>
        </div>
      </div>

      {/* Tip y metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-lg flex items-start gap-4" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <Lightbulb size={24} style={{ color: "#3B82F6" }} className="shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">Consejo financiero</p>
            <p className="text-sm" style={{ color: "#94A3B8" }}>{tip}</p>
          </div>
        </div>

        <div className="p-5 rounded-lg" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <p className="text-sm font-semibold text-white mb-2">Progreso de metas</p>
          <p className="text-2xl font-bold text-white">
            {isPrivate ? masked : `${stats.goalsCompleted}/${stats.goalsTotal}`}
          </p>
          <p className="text-sm" style={{ color: "#94A3B8" }}>Metas completadas</p>
        </div>
      </div>
    </div>
  )
}
