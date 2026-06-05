import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const saving = await prisma.saving.findUnique({ where: { id } })
  if (!saving || saving.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const deposits = await prisma.savingDeposit.findMany({
    where: { savingId: id },
    orderBy: { date: "asc" },
    include: { wallet: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json(deposits)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const saving = await prisma.saving.findUnique({ where: { id } })
  if (!saving || saving.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const amount = parseFloat(body.amount) // positive = deposit, negative = withdrawal
  const walletId = body.walletId || null

  // Verify wallet belongs to user if provided
  if (walletId) {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
    if (!wallet || wallet.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const depositData = {
    savingId: id,
    amount,
    note: body.note || null,
    date: new Date(body.date),
    walletId,
  }

  const INVESTMENT_TYPES = new Set(["CETES / Bonos", "Inversiones", "Crypto", "Afore / Pensión", "Bienes Raíces", "Otros"])
  const txCategory = INVESTMENT_TYPES.has(saving.type) ? "Inversiones" : "Ahorros"

  if (walletId) {
    const txDate = new Date(body.date)
    // deposit: money leaves wallet. withdrawal: money returns to wallet.
    const isDeposit = amount > 0
    const [deposit] = await prisma.$transaction([
      prisma.savingDeposit.create({
        data: depositData,
        include: { wallet: { select: { id: true, name: true, color: true } } },
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: -amount } },
      }),
      // Record movement so it appears in transactions
      prisma.transaction.create({
        data: {
          userId,
          type: isDeposit ? "expense" : "income",
          amount: Math.abs(amount),
          category: txCategory,
          description: `${isDeposit ? "Depósito" : "Retiro"}: ${saving.name}`,
          date: txDate,
          walletId,
        },
      }),
    ])
    return NextResponse.json(deposit, { status: 201 })
  }

  const deposit = await prisma.savingDeposit.create({
    data: depositData,
    include: { wallet: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json(deposit, { status: 201 })
}
