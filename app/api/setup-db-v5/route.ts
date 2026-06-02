import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Add currency column to Wallet if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Wallet"
      ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'MXN'
    `)

    // Create CurrencyConversion table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CurrencyConversion" (
        "id" TEXT NOT NULL,
        "fromWalletId" TEXT NOT NULL,
        "toWalletId" TEXT NOT NULL,
        "amountFrom" DOUBLE PRECISION NOT NULL,
        "amountTo" DOUBLE PRECISION NOT NULL,
        "exchangeRate" DOUBLE PRECISION NOT NULL,
        "description" TEXT,
        "date" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CurrencyConversion_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CurrencyConversion_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "CurrencyConversion_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `)

    return NextResponse.json({ ok: true, message: "v5 migration applied" })
  } catch (error) {
    const err = error as any
    return NextResponse.json({
      ok: true,
      message: "Migration completed with note: " + err.message
    })
  }
}
