import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const limit = searchParams.get("limit")

  const transactions = await prisma.transaction.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: { date: "desc" },
    take: limit ? parseInt(limit) : undefined,
    include: { wallet: { select: { id: true, name: true, color: true, type: true } } },
  })

  return NextResponse.json(transactions)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const amount = parseFloat(body.amount)
  const walletId = body.walletId || null

  if (!walletId) {
    return NextResponse.json({ error: "walletId es obligatorio" }, { status: 400 })
  }

  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
  }

  // Verify wallet belongs to user
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
  if (!wallet || wallet.userId !== userId) {
    return NextResponse.json({ error: "Cartera no encontrada" }, { status: 404 })
  }

  // Debt payment flow: debtId provided → use debt name as category, reduce debt balance
  const debtId = body.debtId || null
  let category = body.category

  if (debtId) {
    const debt = await prisma.debt.findUnique({ where: { id: debtId } })
    if (!debt || debt.userId !== userId) {
      return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 })
    }
    category = debt.name

    // Auto-create a category for this debt if it doesn't exist yet
    await prisma.category.upsert({
      where: { userId_name_type: { userId, name: debt.name, type: "expense" } },
      update: {},
      create: { userId, name: debt.name, type: "expense", color: "#DC2626", macro: "Necesidades" },
    })
  }

  const txData = {
    userId,
    type: body.type,
    amount,
    category,
    description: body.description || null,
    date: new Date(body.date),
    walletId,
  }

  const balanceDelta = body.type === "income" ? amount : -amount

  let transaction
  if (debtId) {
    ;[transaction] = await prisma.$transaction([
      prisma.transaction.create({ data: txData, include: { wallet: { select: { id: true, name: true, color: true, type: true } } } }),
      prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: balanceDelta } } }),
      prisma.debt.update({ where: { id: debtId }, data: { balance: { decrement: amount } } }),
    ])
  } else {
    ;[transaction] = await prisma.$transaction([
      prisma.transaction.create({ data: txData, include: { wallet: { select: { id: true, name: true, color: true, type: true } } } }),
      prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: balanceDelta } } }),
    ])
  }

  return NextResponse.json(transaction, { status: 201 })
}
