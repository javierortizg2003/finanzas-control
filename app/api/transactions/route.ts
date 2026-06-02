import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const limit = searchParams.get("limit")

  const transactions = await prisma.transaction.findMany({
    where: type ? { type } : undefined,
    orderBy: { date: "desc" },
    take: limit ? parseInt(limit) : undefined,
  })

  return NextResponse.json(transactions)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const transaction = await prisma.transaction.create({
    data: {
      type: body.type,
      amount: parseFloat(body.amount),
      category: body.category,
      description: body.description || null,
      date: new Date(body.date),
    },
  })

  return NextResponse.json(transaction, { status: 201 })
}
