import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_RULE = { needsPct: 50, wantsPct: 30, savingsPct: 20 }

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rule = await prisma.budgetRule.findUnique({ where: { userId } })
    return NextResponse.json(rule ?? DEFAULT_RULE)
  } catch {
    // Table may not exist yet — return defaults
    return NextResponse.json(DEFAULT_RULE)
  }
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { needsPct, wantsPct, savingsPct } = await request.json()

  if (
    typeof needsPct !== "number" || typeof wantsPct !== "number" || typeof savingsPct !== "number" ||
    Math.round(needsPct + wantsPct + savingsPct) !== 100
  ) {
    return NextResponse.json({ error: "Los porcentajes deben sumar 100" }, { status: 400 })
  }

  try {
    const rule = await prisma.budgetRule.upsert({
      where: { userId },
      create: { userId, needsPct, wantsPct, savingsPct },
      update: { needsPct, wantsPct, savingsPct },
    })
    return NextResponse.json(rule)
  } catch {
    return NextResponse.json({ error: "No se pudo guardar. Ejecuta: npx prisma db push" }, { status: 500 })
  }
}
