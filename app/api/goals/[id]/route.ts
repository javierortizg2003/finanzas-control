import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      targetAmount: parseFloat(body.targetAmount),
      currentAmount: parseFloat(body.currentAmount || 0),
      deadline: body.deadline ? new Date(body.deadline) : null,
      category: body.category || null,
      color: body.color || "#10B981",
    },
  })

  return NextResponse.json(goal)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.goal.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
