import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { calculateHealthScore, calculateSavingCurrentValue, CATEGORY_COLORS } from "@/lib/utils"
import { getExchangeRates } from "@/lib/exchangeRates"

const INVESTMENT_TYPES = new Set(["CETES / Bonos", "Inversiones", "Crypto", "Afore / Pensión", "Bienes Raíces", "Otros"])

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

  const [allTransactions, savings, goals, wallets, debts, assets, pref, rateMap] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" }, include: { wallet: true } }),
    prisma.saving.findMany({ where: { userId }, include: { deposits: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.wallet.findMany({ where: { userId } }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.asset.findMany({ where: { userId } }),
    prisma.userPreference.findUnique({ where: { userId } }),
    getExchangeRates(),
  ])

  const baseCurrency = pref?.baseCurrency ?? "MXN"

  // Converts a transaction amount to baseCurrency.
  // Uses the linked wallet's currency if available, otherwise assumes MXN.
  const txToBase = (amount: number, walletCurrency?: string | null) => {
    const from = walletCurrency ?? "MXN"
    return toBaseCurrency(amount, from, baseCurrency, rateMap) ?? amount
  }

  // ── Monthly income & expenses ────────────────────────────────────────────
  const monthlyTx = allTransactions.filter(t => t.date >= startOfMonth && t.date <= endOfMonth)
  const monthlyIncome   = monthlyTx.filter(t => t.type === "income").reduce((s, t) => s + txToBase(t.amount, t.wallet?.currency), 0)
  const monthlyExpenses = monthlyTx.filter(t => t.type === "expense").reduce((s, t) => s + txToBase(t.amount, t.wallet?.currency), 0)

  // ── Savings & investments — split by type, convert using each saving's currency ─
  const calcValue = (sv: typeof savings[number]) =>
    calculateSavingCurrentValue(
      sv.deposits.map(d => ({ amount: d.amount, date: d.date.toISOString() })),
      sv.interestRate
    )

  let totalSavings = 0
  let totalInvestments = 0
  for (const sv of savings) {
    const raw = calcValue(sv)
    const svCurrency = sv.currency ?? "MXN"
    const converted = toBaseCurrency(raw, svCurrency, baseCurrency, rateMap) ?? raw
    if (INVESTMENT_TYPES.has(sv.type)) {
      totalInvestments += converted
    } else {
      totalSavings += converted
    }
  }

  // ── Wallet total ─────────────────────────────────────────────────────────
  // Credit cards have negative balances and are included so they naturally
  // reduce net worth. Do NOT add them separately to the Debt model.
  let walletTotal = 0
  let unconvertedWalletCount = 0

  for (const w of wallets) {
    const converted = toBaseCurrency(w.balance, w.currency, baseCurrency, rateMap)
    if (converted !== null) {
      walletTotal += converted
    } else {
      unconvertedWalletCount++
    }
  }

  // ── Debts — no currency field, assume MXN ───────────────────────────────
  // Math.abs guards against balances entered as negative (they're debts, always positive).
  const totalDebtMXN = debts.reduce((s, d) => s + Math.abs(d.balance), 0)
  const totalDebt = toBaseCurrency(totalDebtMXN, "MXN", baseCurrency, rateMap) ?? totalDebtMXN

  // ── Assets — no currency field, assume MXN ──────────────────────────────
  const totalAssetsMXN = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalAssets = toBaseCurrency(totalAssetsMXN, "MXN", baseCurrency, rateMap) ?? totalAssetsMXN

  // ── Net worth: activos - pasivos ─────────────────────────────────────────
  const netWorth = walletTotal + totalSavings + totalInvestments + totalAssets - totalDebt

  // ── Health score ─────────────────────────────────────────────────────────
  const avgGoalProgress =
    goals.length > 0
      ? goals.reduce((s, g) => s + Math.min(1, g.currentAmount / (g.targetAmount || 1)), 0) / goals.length
      : 0

  const healthScore = calculateHealthScore({
    monthlyIncome,
    monthlyExpenses,
    totalSavings: walletTotal + totalSavings + totalInvestments,
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
    totalInvestments,
    walletTotal,
    totalAssets,
    totalDebt,
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
