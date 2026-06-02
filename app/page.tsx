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
import { formatCurrency, formatPercent, formatDate, getHealthLabel, FINANCIAL_TIPS } from "@/lib/utils"

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
}

function StatCard({
  label, value, icon: Icon, color, subtitle, trend,
}: {
  label: string; value: string; icon: React.ElementType
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
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === "up"
            ? <ArrowUpRight size={14} className="text-emerald-400" />
            : <ArrowDownRight size={14} className="text-red-400" />}
          <span style={{ color: trend === "up" ? "#34D399" : "#F87171" }}>
            {trend === "up" ? "Positivo" : "Revisar"}
          </span>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#0D1B33", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 14px" }}>
      <div className="text-xs font-semibold text-white mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-xs flex gap-2">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tip] = useState(() => FINANCIAL_TIPS[Math.floor(Math.random() * FINANCIAL_TIPS.length)])

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-4" />
          <div style={{ color: "#94A3B8" }}>Cargando tu dashboard...</div>
        </div>
      </div>
    )
  }

  const health = getHealthLabel(stats?.healthScore || 0)
  const balance = (stats?.monthlyIncome || 0) - (stats?.monthlyExpenses || 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Panel de Control</h1>
        <p style={{ color: "#64748B" }} className="mt-1">
          {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(stats?.monthlyIncome || 0)}
          icon={TrendingUp}
          color="#10B981"
          trend="up"
        />
        <StatCard
          label="Gastos del mes"
          value={formatCurrency(stats?.monthlyExpenses || 0)}
          icon={TrendingDown}
          color="#EF4444"
          trend={balance >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Balance mensual"
          value={formatCurrency(balance)}
          icon={balance >= 0 ? ArrowUpRight : ArrowDownRight}
          color={balance >= 0 ? "#10B981" : "#EF4444"}
          subtitle={balance >= 0 ? "¡Vas bien!" : "Gastos > ingresos"}
        />
        <StatCard
          label="Total ahorros"
          value={formatCurrency(stats?.totalSavings || 0)}
          icon={PiggyBank}
          color="#6366F1"
          subtitle={`Tasa: ${formatPercent(stats?.savingsRate || 0)}`}
        />
        <div className="stat-card p-5 fade-in col-span-2 lg:col-span-1">
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>
            Salud Financiera
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-white">{stats?.healthScore || 0}</div>
            <div className="text-sm mb-1" style={{ color: "#64748B" }}>/100</div>
          </div>
          <div className={`text-sm font-medium mt-1 ${health.color}`}>{health.label}</div>
          <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${stats?.healthScore || 0}%`,
                background: "linear-gradient(90deg, #059669, #10B981)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">

        {/* Income vs Expenses Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Ingresos vs Gastos</h2>
              <p style={{ color: "#64748B" }} className="text-xs">Últimos 6 meses</p>
            </div>
            <Zap size={18} style={{ color: "#10B981" }} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.monthlyData || []} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Ingresos" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill="#EF4444" radius={[6, 6, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: "#10B981" }} /> Ingresos
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: "#EF4444" }} /> Gastos
            </div>
          </div>
        </div>

        {/* Savings Distribution */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Mis Ahorros</h2>
              <p style={{ color: "#64748B" }} className="text-xs">Distribución</p>
            </div>
            <PiggyBank size={18} style={{ color: "#6366F1" }} />
          </div>
          {(stats?.savingsDistribution?.length || 0) > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats?.savingsDistribution}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {stats?.savingsDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {stats?.savingsDistribution.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span style={{ color: "#94A3B8" }} className="truncate max-w-24">{s.name}</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <PiggyBank size={32} style={{ color: "#334155" }} className="mx-auto mb-2" />
                <p style={{ color: "#475569" }} className="text-xs">Agrega tus ahorros</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Transacciones Recientes</h2>
          </div>
          {(stats?.recentTransactions?.length || 0) === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p style={{ color: "#475569" }} className="text-sm">Sin transacciones aún. ¡Registra tu primer ingreso!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(6,13,31,0.5)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{
                        background: tx.type === "income" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      }}>
                      {tx.type === "income" ? "↑" : "↓"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{tx.category}</div>
                      <div className="text-xs" style={{ color: "#64748B" }}>
                        {tx.description || formatDate(tx.date)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips & Goals */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} style={{ color: "#F59E0B" }} />
              <span className="text-sm font-semibold text-white">Consejo del día</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{tip}</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} style={{ color: "#6366F1" }} />
              <span className="text-sm font-semibold text-white">Mis Metas</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.1)" }}>
                <div className="text-2xl font-bold text-white">{stats?.goalsTotal || 0}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>Total</div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.1)" }}>
                <div className="text-2xl font-bold text-emerald-400">{stats?.goalsCompleted || 0}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>Completadas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
