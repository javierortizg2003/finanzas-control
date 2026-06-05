import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
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

  const payments = await prisma.debtPayment.findMany({
    where: { debtId: id },
    orderBy: { date: "asc" },
  })
  return NextResponse.json(payments)
}
