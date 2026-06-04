import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { calculateHealthScore, calculateSavingCurrentValue, CATEGORY_COLORS } from "@/lib/utils"

// Converts `amount` from `fromCurrency` to `baseCurrency` using the rateMap.
// Tries both the direct rate (from→base) and the inverse (base→from).
// Returns null when no rate is known for the pair.
function toBaseCurrency(
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  rateMap: Map<string, number>
): number | null {
  if (fromCurrency === baseCurrency) return amount
  const direct = rateMap.get(`${fromCurrency}→${baseCurrency}`)
  if (direct !== undefined) return amount * direct
  const inverse = rateMap.get(`${baseCurrency}→${fromCurrency}`)
  if (inverse !== undefined && inverse !== 0) return amount / inverse
  return null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [allTransactions, savings, goals, wallets, pref, exchangeRates] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.saving.findMany({ where: { userId }, include: { deposits: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.wallet.findMany({ where: { userId } }),
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.exchangeRate.findMany(),
  ])

  const baseCurrency = pref?.baseCurrency ?? "MXN"

  // Build O(1) lookup: "USD→MXN" → 17.35
  const rateMap = new Map<string, number>()
  for (const r of exchangeRates) {
    rateMap.set(`${r.fromCurrency}→${r.toCurrency}`, r.rate)
  }

  // ── Monthly income & expenses ────────────────────────────────────────────
  const monthlyTx = allTransactions.filter(t => t.date >= startOfMonth && t.date <= endOfMonth)
  const monthlyIncome   = monthlyTx.filter(t => t.type === "income").reduce((s, t)  => s + t.amount, 0)
  const monthlyExpenses = monthlyTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  // ── Savings (with compound interest) ────────────────────────────────────
  const totalSavings = savings.reduce(
    (s, sv) => s + calculateSavingCurrentValue(
      sv.deposits.map(d => ({ amount: d.amount, date: d.date.toISOString() })),
      sv.interestRate
    ),
    0
  )

  // ── Wallet total — BUG #1 FIX: "CREDIT_CARD" (not "credit") ─────────────
  // BUG #2 FIX: convert each wallet to baseCurrency before summing
  let walletTotal = 0
  let unconvertedWalletCount = 0

  for (const w of wallets) {
    if (w.type === "CREDIT_CARD") continue  // credit card debt handled separately

    const converted = toBaseCurrency(w.balance, w.currency, baseCurrency, rateMap)
    if (converted !== null) {
      walletTotal += converted
    } else {
      unconvertedWalletCount++
      // Wallet is in a currency with no known rate — exclude from total
    }
  }

  // ── Net worth (assets only; Debt model handles liabilities) ─────────────
  const netWorth = totalSavings + walletTotal

  // ── Health score ─────────────────────────────────────────────────────────
  const avgGoalProgress =
    goals.length > 0
      ? goals.reduce((s, g) => s + Math.min(1, g.currentAmount / (g.targetAmount || 1)), 0) / goals.length
      : 0

  const healthScore = calculateHealthScore({
    monthlyIncome,
    monthlyExpenses,
    totalSavings: totalSavings + walletTotal,
    avgGoalProgress,
  })

  // ── Monthly chart data (last 6 months) ───────────────────────────────────
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const month = d.toLocaleDateString("es-MX", { month: "short" })
    const monthTx = allTransactions.filter(t => t.date >= start && t.date <= end)
    monthlyData.push({
      month,
      income:   monthTx.filter(t => t.type === "income").reduce((s, t)  => s + t.amount, 0),
      expenses: monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    })
  }

  // ── Savings distribution ─────────────────────────────────────────────────
  const savingsDistribution = savings.map(s => ({
    name:   s.name,
    amount: calculateSavingCurrentValue(
      s.deposits.map(d => ({ amount: d.amount, date: d.date.toISOString() })),
      s.interestRate
    ),
    color: s.color,
    type:  s.type,
  }))

  // ── Expense categories ───────────────────────────────────────────────────
  const expensesByCategory: Record<string, number> = {}
  monthlyTx.filter(t => t.type === "expense").forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount
  })
  const categoryData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#94A3B8" }))
    .sort((a, b) => b.value - a.value)

  const savingsRate = monthlyIncome > 0
    ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0

  return NextResponse.json({
    // Financials
    monthlyIncome,
    monthlyExpenses,
    totalSavings,
    walletTotal,
    savingsRate,
    netWorth,
    // Meta
    baseCurrency,
    unconvertedWalletCount,
    // Scores & goals
    healthScore,
    goalsTotal:     goals.length,
    goalsCompleted: goals.filter(g => g.currentAmount >= g.targetAmount).length,
    // Chart data
    monthlyData,
    savingsDistribution,
    categoryData,
    recentTransactions: allTransactions.slice(0, 8),
  })
}
