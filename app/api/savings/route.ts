import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const savings = await prisma.saving.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { deposits: { orderBy: { date: "asc" } } },
  })
  return NextResponse.json(savings)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const pref = await prisma.userPreference.findUnique({ where: { userId } })
  const saving = await prisma.saving.create({
    data: {
      userId,
      name: body.name,
      institution: body.institution || null,
      type: body.type,
      currency: body.currency || pref?.baseCurrency || "MXN",
      interestRate: parseFloat(body.interestRate || 0),
      color: body.color || "#10B981",
    },
    include: { deposits: true },
  })
  return NextResponse.json(saving, { status: 201 })
}
