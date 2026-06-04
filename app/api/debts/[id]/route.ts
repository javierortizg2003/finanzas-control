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

// Registrar un abono: reduce el saldo de la deuda automáticamente.
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

  // El saldo nunca baja de cero (un abono no puede dejar la deuda en negativo).
  const newBalance = Math.max(0, debt.balance - payment)
  const updated = await prisma.debt.update({
    where: { id },
    data: { balance: newBalance },
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
