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

  // Verify wallet belongs to user if provided
  if (walletId) {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
    if (!wallet || wallet.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const txData = {
    userId,
    type: body.type,
    amount,
    category: body.category,
    description: body.description || null,
    date: new Date(body.date),
    walletId,
  }

  if (walletId) {
    // Update wallet balance atomically
    const balanceDelta = body.type === "income" ? amount : -amount
    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({ data: txData, include: { wallet: { select: { id: true, name: true, color: true, type: true } } } }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: balanceDelta } },
      }),
    ])
    return NextResponse.json(transaction, { status: 201 })
  }

  const transaction = await prisma.transaction.create({
    data: txData,
    include: { wallet: { select: { id: true, name: true, color: true, type: true } } },
  })
  return NextResponse.json(transaction, { status: 201 })
}
