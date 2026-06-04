import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { category, amount, month, year, half } = await request.json()
  if (!category || typeof amount !== "number" || !month || !year || !half) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const existing = await prisma.categoryBudget.findUnique({
    where: { userId_category_month_year_half: { userId, category, month, year, half } },
  })

  if (existing) {
    await prisma.categoryBudget.update({ where: { id: existing.id }, data: { amount } })
  } else {
    await prisma.categoryBudget.create({ data: { userId, category, amount, month, year, half } })
  }

  return NextResponse.json({ ok: true })
}
