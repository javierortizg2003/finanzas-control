import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const transfers = await prisma.transfer.findMany({
    orderBy: { date: "desc" },
    include: { fromWallet: true, toWallet: true },
  })
  return NextResponse.json(transfers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const amount = parseFloat(body.amount)

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
