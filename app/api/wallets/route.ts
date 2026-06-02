import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { createdAt: "asc" },
    include: { transactions: true },
  })
  return NextResponse.json(wallets)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const wallet = await prisma.wallet.create({
    data: {
      name: body.name,
      type: body.type,
      bank: body.bank || null,
      balance: parseFloat(body.balance || 0),
      color: body.color || "#10B981",
    },
  })
  return NextResponse.json(wallet, { status: 201 })
}
