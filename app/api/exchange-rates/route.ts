import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// GET: devuelve todas las tasas conocidas (necesario para el dashboard y /carteras)
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rates = await prisma.exchangeRate.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(rates)
}

// POST: upserta una tasa manualmente (ej. desde /configuracion)
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { fromCurrency, toCurrency, rate } = await request.json()
  if (!fromCurrency || !toCurrency || rate == null) {
    return NextResponse.json({ error: "fromCurrency, toCurrency y rate son requeridos" }, { status: 400 })
  }

  const exchangeRate = await prisma.exchangeRate.upsert({
    where:  { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
    create: { fromCurrency, toCurrency, rate: parseFloat(rate) },
    update: { rate: parseFloat(rate) },
  })
  return NextResponse.json(exchangeRate)
}
