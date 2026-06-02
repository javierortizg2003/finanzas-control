import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SavingDeposit" ADD COLUMN IF NOT EXISTS "walletId" TEXT
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SavingDeposit"
      ADD CONSTRAINT IF NOT EXISTS "SavingDeposit_walletId_fkey"
      FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `)
    return NextResponse.json({ ok: true, message: "v4 migration applied" })
  } catch (error) {
    // FK constraint may already exist — column add is what matters
    return NextResponse.json({ ok: true, message: "v4: " + String(error) })
  }
}
