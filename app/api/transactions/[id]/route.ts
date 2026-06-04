import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const newAmount   = body.amount   !== undefined ? parseFloat(body.amount)       : existing.amount
  const newWalletId = body.walletId !== undefined ? (body.walletId || null)        : existing.walletId
  const newCategory = body.category ?? existing.category
  const newDesc     = body.description !== undefined ? (body.description || null)  : existing.description
  const newDate     = body.date ? new Date(body.date) : existing.date

  if (!newWalletId) {
    return NextResponse.json({ error: "walletId es obligatorio" }, { status: 400 })
  }

  const wallet = await prisma.wallet.findUnique({ where: { id: newWalletId } })
  if (!wallet || wallet.userId !== userId) {
    return NextResponse.json({ error: "Cartera no encontrada" }, { status: 404 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Reverse old balance effect
    if (existing.walletId) {
      const reversal = existing.type === "income" ? -existing.amount : existing.amount
      await tx.wallet.update({
        where: { id: existing.walletId },
        data: { balance: { increment: reversal } },
      })
    }
    // Apply new balance effect
    const delta = existing.type === "income" ? newAmount : -newAmount
    await tx.wallet.update({
      where: { id: newWalletId },
      data: { balance: { increment: delta } },
    })
    return tx.transaction.update({
      where: { id },
      data: { amount: newAmount, walletId: newWalletId, category: newCategory, description: newDesc, date: newDate },
      include: { wallet: { select: { id: true, name: true, color: true, type: true } } },
    })
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Fetch first to reverse wallet balance if linked
  const tx = await prisma.transaction.findUnique({ where: { id } })
  if (!tx || tx.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (tx?.walletId) {
    // Reverse: income was +, so reverse is -; expense was -, so reverse is +
    const balanceDelta = tx.type === "income" ? -tx.amount : tx.amount
    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: balanceDelta } },
      }),
    ])
  } else {
    await prisma.transaction.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}
