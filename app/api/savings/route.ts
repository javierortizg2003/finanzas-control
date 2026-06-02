import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const savings = await prisma.saving.findMany({
    orderBy: { amount: "desc" },
  })
  return NextResponse.json(savings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const saving = await prisma.saving.create({
    data: {
      name: body.name,
      institution: body.institution || null,
      amount: parseFloat(body.amount),
      type: body.type,
      interestRate: parseFloat(body.interestRate || 0),
      color: body.color || "#10B981",
    },
  })

  return NextResponse.json(saving, { status: 201 })
}
