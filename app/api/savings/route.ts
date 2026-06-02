import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const savings = await prisma.saving.findMany({
    orderBy: { createdAt: "asc" },
    include: { deposits: { orderBy: { date: "asc" } } },
  })
  return NextResponse.json(savings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const saving = await prisma.saving.create({
    data: {
      name: body.name,
      institution: body.institution || null,
      type: body.type,
      interestRate: parseFloat(body.interestRate || 0),
      color: body.color || "#10B981",
    },
    include: { deposits: true },
  })
  return NextResponse.json(saving, { status: 201 })
}
