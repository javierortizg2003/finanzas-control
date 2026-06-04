import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pref = await prisma.userPreference.findUnique({ where: { userId } })
  return NextResponse.json({ baseCurrency: pref?.baseCurrency ?? "MXN" })
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { baseCurrency } = await request.json()
  if (!baseCurrency || typeof baseCurrency !== "string") {
    return NextResponse.json({ error: "baseCurrency requerido" }, { status: 400 })
  }

  const pref = await prisma.userPreference.upsert({
    where:  { userId },
    create: { userId, baseCurrency },
    update: { baseCurrency },
  })
  return NextResponse.json(pref)
}
