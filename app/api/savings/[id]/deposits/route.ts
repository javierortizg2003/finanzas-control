import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deposits = await prisma.savingDeposit.findMany({
    where: { savingId: id },
    orderBy: { date: "asc" },
  })
  return NextResponse.json(deposits)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const deposit = await prisma.savingDeposit.create({
    data: {
      savingId: id,
      amount: parseFloat(body.amount),
      note: body.note || null,
      date: new Date(body.date),
    },
  })
  return NextResponse.json(deposit, { status: 201 })
}
