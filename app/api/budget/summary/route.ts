import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

async function ensureMigrated() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "macro" TEXT;`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BudgetRule" (
      "userId"     TEXT NOT NULL,
      "needsPct"   DOUBLE PRECISION NOT NULL DEFAULT 50,
      "wantsPct"   DOUBLE PRECISION NOT NULL DEFAULT 30,
      "savingsPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
      "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BudgetRule_pkey" PRIMARY KEY ("userId")
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CategoryBudget" (
      "id"        TEXT NOT NULL,
      "userId"    TEXT NOT NULL,
      "category"  TEXT NOT NULL,
      "amount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "month"     INTEGER NOT NULL,
      "year"      INTEGER NOT NULL,
      "half"      INTEGER NOT NULL DEFAULT 1,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id")
    );
  `)
  // Migrate old schema: add half column if missing, drop old unique, add new
  await prisma.$executeRawUnsafe(`ALTER TABLE "CategoryBudget" ADD COLUMN IF NOT EXISTS "half" INTEGER NOT NULL DEFAULT 1;`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "CategoryBudget" DROP CONSTRAINT IF EXISTS "CategoryBudget_userId_category_month_year_key";`)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "CategoryBudget_userId_category_month_year_half_key"
      ON "CategoryBudget"("userId", "category", "month", "year", "half");
  `)
}

export async function GET(request: NextRequest) {
  void request
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureMigrated()

  const now     = new Date()
  const month   = now.getMonth() + 1
  const year    = now.getFullYear()
  const lastDay = new Date(year, month, 0).getDate()

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth   = new Date(year, month, 0, 23, 59, 59)
  const q1End        = new Date(year, month - 1, 15, 23, 59, 59)
  const q2Start      = new Date(year, month - 1, 16)

  const [allTxs, categories, rule, catBudgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.category.findMany({ where: { userId, type: "expense" }, orderBy: { createdAt: "asc" } }),
    prisma.budgetRule.findUnique({ where: { userId } }).catch(() => null),
    prisma.categoryBudget.findMany({ where: { userId, month, year } }).catch(() => []),
  ])

  const q1Txs = allTxs.filter((t) => t.date <= q1End)
  const q2Txs = allTxs.filter((t) => t.date >= q2Start)

  const buildActual = (txs: typeof allTxs) => {
    const map: Record<string, number> = {}
    for (const tx of txs.filter((t) => t.type === "expense"))
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount
    return map
  }

  const q1Actual  = buildActual(q1Txs)
  const q2Actual  = buildActual(q2Txs)

  // Income
  const income = {
    q1:      q1Txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    q2:      q2Txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    monthly: allTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
  }

  // Budget maps: half 1=Q1, 2=Q2
  const budgetQ1: Record<string, number> = {}
  const budgetQ2: Record<string, number> = {}
  for (const cb of catBudgets) {
    if (cb.half === 1) budgetQ1[cb.category] = cb.amount
    if (cb.half === 2) budgetQ2[cb.category] = cb.amount
  }

  type CatRow = {
    id: string | null; name: string; macro: string | null; color: string
    budgetQ1: number; budgetQ2: number
    actualQ1: number; actualQ2: number
  }

  const catRows: CatRow[] = categories.map((c) => ({
    id:       c.id,
    name:     c.name,
    macro:    (c as { macro?: string | null }).macro ?? null,
    color:    c.color,
    budgetQ1: budgetQ1[c.name] ?? 0,
    budgetQ2: budgetQ2[c.name] ?? 0,
    actualQ1: q1Actual[c.name]  ?? 0,
    actualQ2: q2Actual[c.name]  ?? 0,
  }))

  // Add orphan categories from transactions
  const knownNames = new Set(categories.map((c) => c.name))
  for (const name of new Set([...Object.keys(q1Actual), ...Object.keys(q2Actual)])) {
    if (!knownNames.has(name)) {
      catRows.push({
        id: null, name, macro: null, color: "#94A3B8",
        budgetQ1: budgetQ1[name] ?? 0, budgetQ2: budgetQ2[name] ?? 0,
        actualQ1: q1Actual[name] ?? 0, actualQ2: q2Actual[name] ?? 0,
      })
    }
  }

  // Macro totals
  type MacroTotals = { budgetQ1: number; budgetQ2: number; actualQ1: number; actualQ2: number }
  const byMacro: Record<string, MacroTotals> = {}
  for (const c of catRows) {
    const key = c.macro ?? "Sin clasificar"
    if (!byMacro[key]) byMacro[key] = { budgetQ1: 0, budgetQ2: 0, actualQ1: 0, actualQ2: 0 }
    byMacro[key].budgetQ1 += c.budgetQ1
    byMacro[key].budgetQ2 += c.budgetQ2
    byMacro[key].actualQ1 += c.actualQ1
    byMacro[key].actualQ2 += c.actualQ2
  }

  return NextResponse.json({
    income,
    categories: catRows,
    byMacro,
    rule: rule ?? { needsPct: 50, wantsPct: 30, savingsPct: 20 },
    month: now.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
    monthNum: month,
    year,
    lastDay,
  })
}
