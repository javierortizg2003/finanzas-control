import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const goals = await prisma.goal.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(goals)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const goal = await prisma.goal.create({
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

  return NextResponse.json(goal, { status: 201 })
}
