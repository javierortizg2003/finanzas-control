import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const transfers = await prisma.transfer.findMany({
    where: {
      fromWallet: { userId },
    },
    orderBy: { date: "desc" },
    include: { fromWallet: true, toWallet: true },
  })
  return NextResponse.json(transfers)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const amount = parseFloat(body.amount)

  // Verify both wallets belong to user
  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { id: body.fromWalletId } }),
    prisma.wallet.findUnique({ where: { id: body.toWalletId } }),
  ])

  if (!fromWallet || fromWallet.userId !== userId || !toWallet || toWallet.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [transfer] = await prisma.$transaction([
    prisma.transfer.create({
      data: {
        fromWalletId: body.fromWalletId,
        toWalletId: body.toWalletId,
        amount,
        description: body.description || null,
        date: new Date(body.date),
      },
    }),
    prisma.wallet.update({
      where: { id: body.fromWalletId },
      data: { balance: { decrement: amount } },
    }),
    prisma.wallet.update({
      where: { id: body.toWalletId },
      data: { balance: { increment: amount } },
    }),
  ])

  return NextResponse.json(transfer, { status: 201 })
}
