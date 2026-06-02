import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateHealthScore, calculateSavingCurrentValue, CATEGORY_COLORS } from "@/lib/utils"

export async function GET() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [allTransactions, savings, goals, wallets] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: "desc" } }),
    prisma.saving.findMany({ include: { deposits: true } }),
    prisma.goal.findMany(),
    prisma.wallet.findMany(),
  ])

  const monthlyTransactions = allTransactions.filter(
    (t) => t.date >= startOfMonth && t.date <= endOfMonth
  )
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0)
  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0)

  // Total savings = sum of current value (with interest) of all saving accounts
  const totalSavings = savings.reduce(
    (s, sv) => s + calculateSavingCurrentValue(
      sv.deposits.map((d) => ({ amount: d.amount, date: d.date.toISOString() })),
      sv.interestRate
    ),
    0
  )

  // Wallet total (non-credit)
  const walletTotal = wallets
    .filter((w) => w.type !== "credit")
    .reduce((s, w) => s + w.balance, 0)

  const avgGoalProgress =
    goals.length > 0
      ? goals.reduce(
          (s, g) => s + Math.min(1, g.currentAmount / (g.targetAmount || 1)),
          0
        ) / goals.length
      : 0

  const healthScore = calculateHealthScore({
    monthlyIncome,
    monthlyExpenses,
    totalSavings: totalSavings + walletTotal,
    avgGoalProgress,
  })

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const month = d.toLocaleDateString("es-MX", { month: "short" })
    const monthTx = allTransactions.filter((t) => t.date >= start && t.date <= end)
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const expenses = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    monthlyData.push({ month, income, expenses })
  }

  const savingsDistribution = savings.map((s) => ({
    name: s.name,
    amount: calculateSavingCurrentValue(
      s.deposits.map((d) => ({ amount: d.amount, date: d.date.toISOString() })),
      s.interestRate
    ),
    color: s.color,
    type: s.type,
  }))

  const expensesByCategory: Record<string, number> = {}
  monthlyTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount
    })

  const categoryData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#94A3B8" }))
    .sort((a, b) => b.value - a.value)

  const recentTransactions = allTransactions.slice(0, 8)
  const savingsRate = monthlyIncome > 0
    ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0

  return NextResponse.json({
    monthlyIncome, monthlyExpenses, totalSavings, walletTotal,
    savingsRate, healthScore, monthlyData, savingsDistribution,
    categoryData, recentTransactions,
    goalsTotal: goals.length,
    goalsCompleted: goals.filter((g) => g.currentAmount >= g.targetAmount).length,
    netWorth: totalSavings + walletTotal,
  })
}
