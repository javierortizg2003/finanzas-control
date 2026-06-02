import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const wallet = await prisma.wallet.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      bank: body.bank || null,
      balance: parseFloat(body.balance || 0),
      color: body.color || "#10B981",
    },
  })
  return NextResponse.json(wallet)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.wallet.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
