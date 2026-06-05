import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(assets)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, type, currentValue, description } = body

  if (!name || !type || currentValue === undefined) {
    return NextResponse.json({ error: "name, type and currentValue are required" }, { status: 400 })
  }

  const asset = await prisma.asset.create({
    data: {
      userId,
      name,
      type,
      currentValue: parseFloat(currentValue),
      description: description || null,
    },
  })
  return NextResponse.json(asset, { status: 201 })
}
