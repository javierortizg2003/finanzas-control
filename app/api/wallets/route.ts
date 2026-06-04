import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { transactions: true },
  })
  return NextResponse.json(wallets)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  console.log("CREATE WALLET body:", JSON.stringify(body))
  const wallet = await prisma.wallet.create({
    data: {
      userId,
      name: body.name,
      type: body.type,
      bank: body.bank || null,
      currency: body.currency || "MXN",
      balance: parseFloat(body.balance || 0),
      initialBalance: parseFloat(body.balance || 0),
      creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
      color: body.color || "#10B981",
    },
  })
  return NextResponse.json(wallet, { status: 201 })
}
