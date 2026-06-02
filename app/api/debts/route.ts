import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const debts = await prisma.debt.findMany({ orderBy: { balance: "asc" } })
  return NextResponse.json(debts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const debt = await prisma.debt.create({
    data: {
      name: body.name,
      balance: parseFloat(body.balance),
      originalBalance: parseFloat(body.balance),
      interestRate: parseFloat(body.interestRate),
      minimumPayment: parseFloat(body.minimumPayment),
      type: body.type || "other",
    },
  })
  return NextResponse.json(debt, { status: 201 })
}
