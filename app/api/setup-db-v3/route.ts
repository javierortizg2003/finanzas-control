import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Debt" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "balance" DOUBLE PRECISION NOT NULL,
        "originalBalance" DOUBLE PRECISION NOT NULL,
        "interestRate" DOUBLE PRECISION NOT NULL,
        "minimumPayment" DOUBLE PRECISION NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'other',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
      )
    `)
    return NextResponse.json({ ok: true, message: "Debt table created" })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
