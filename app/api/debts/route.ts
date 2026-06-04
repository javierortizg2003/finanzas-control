import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const debts = await prisma.debt.findMany({
    where: { userId },
    orderBy: { balance: "asc" },
  })
  return NextResponse.json(debts)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const debt = await prisma.debt.create({
    data: {
      userId,
      name: body.name,
      balance: parseFloat(body.balance),
      originalBalance: parseFloat(body.balance),
      interestRate: parseFloat(body.interestRate),
      minimumPayment: parseFloat(body.minimumPayment),
      type: body.type || "other",
      termMonths: body.termMonths ? parseInt(body.termMonths) : null,
      lifeInsurance: body.lifeInsurance ? parseFloat(body.lifeInsurance) : 0,
      debtInsurance: body.debtInsurance ? parseFloat(body.debtInsurance) : 0,
      isMixedRate: body.isMixedRate === true,
    },
  })
  return NextResponse.json(debt, { status: 201 })
}
