import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const debt = await prisma.debt.update({
    where: { id },
    data: {
      name: body.name,
      balance: parseFloat(body.balance),
      interestRate: parseFloat(body.interestRate),
      minimumPayment: parseFloat(body.minimumPayment),
      type: body.type || "other",
    },
  })
  return NextResponse.json(debt)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.debt.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
