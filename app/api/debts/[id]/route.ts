import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const updated = await prisma.debt.update({
    where: { id },
    data: {
      name: body.name,
      balance: parseFloat(body.balance),
      interestRate: parseFloat(body.interestRate),
      minimumPayment: parseFloat(body.minimumPayment),
      type: body.type || "other",
    },
  })
  return NextResponse.json(updated)
}

// Registrar un abono: reduce el saldo y guarda el desglose (capital/interés/seguro).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const payment = parseFloat(body.payment)
  if (Number.isNaN(payment) || payment <= 0) {
    return NextResponse.json({ error: "Monto de abono inválido" }, { status: 400 })
  }

  const walletId = body.walletId
  if (!walletId) return NextResponse.json({ error: "walletId es requerido" }, { status: 400 })
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
  if (!wallet || wallet.userId !== userId) {
    return NextResponse.json({ error: "Cartera no encontrada" }, { status: 404 })
  }

  const lifeIns   = debt.lifeInsurance  ?? 0
  const debtIns   = debt.debtInsurance  ?? 0
  const insurance = lifeIns + debtIns
  const r         = debt.interestRate / 100 / 12
  // Interés real de este mes sobre el saldo actual
  const interest  = Math.min(payment, parseFloat((debt.balance * r).toFixed(2)))
  // Lo que queda después de interés y seguros va a capital
  const capital   = Math.max(0, Math.min(debt.balance, parseFloat((payment - interest - insurance).toFixed(2))))
  const newBalance = Math.max(0, parseFloat((debt.balance - capital).toFixed(2)))
  const date      = body.date ? new Date(body.date) : new Date()

  const updated = await prisma.$transaction(async (tx) => {
    const debtUpdated = await tx.debt.update({ where: { id }, data: { balance: newBalance } })
    await tx.debtPayment.create({
      data: {
        debtId:       id,
        amount:       payment,
        capital,
        interest,
        insurance:    Math.min(payment, insurance),
        balanceAfter: newBalance,
        date,
        note: body.note ?? null,
      },
    })
    await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: -payment } } })
    await tx.transaction.create({
      data: {
        userId,
        walletId,
        type:        "expense",
        amount:      payment,
        category:    "Deudas",
        description: `Abono: ${debt.name}`,
        date,
      },
    })
    return debtUpdated
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.debt.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
