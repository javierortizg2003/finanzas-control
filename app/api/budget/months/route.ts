import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [txRows, budgetRows] = await Promise.all([
    prisma.$queryRaw<{ month: number; year: number }[]>`
      SELECT EXTRACT(MONTH FROM "date")::int AS month, EXTRACT(YEAR FROM "date")::int AS year
      FROM "Transaction"
      WHERE "userId" = ${userId}
      GROUP BY month, year
    `,
    prisma.categoryBudget.findMany({
      where: { userId },
      select: { month: true, year: true },
      distinct: ["month", "year"],
    }).catch(() => [] as { month: number; year: number }[]),
  ])

  const seen = new Set<string>()
  const months: { month: number; year: number }[] = []

  // Always include current month
  const now = new Date()
  const addMonth = (m: number, y: number) => {
    const key = `${y}-${m}`
    if (!seen.has(key)) { seen.add(key); months.push({ month: m, year: y }) }
  }

  addMonth(now.getMonth() + 1, now.getFullYear())
  for (const r of txRows) addMonth(r.month, r.year)
  for (const r of budgetRows) addMonth(r.month, r.year)

  months.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)

  return NextResponse.json(months)
}
