import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const saving = await prisma.saving.update({
    where: { id },
    data: {
      name: body.name,
      institution: body.institution || null,
      amount: parseFloat(body.amount),
      type: body.type,
      interestRate: parseFloat(body.interestRate || 0),
      color: body.color || "#10B981",
    },
  })

  return NextResponse.json(saving)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.saving.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
