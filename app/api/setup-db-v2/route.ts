import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Add walletId column to Transaction if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "walletId" TEXT
    `)

    // Create Wallet table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Wallet" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "bank" TEXT,
        "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "color" TEXT NOT NULL DEFAULT '#10B981',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
      )
    `)

    // Create Transfer table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Transfer" (
        "id" TEXT NOT NULL,
        "fromWalletId" TEXT NOT NULL,
        "toWalletId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "description" TEXT,
        "date" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Transfer_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Transfer_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `)

    // Drop old Saving table and recreate without amount column
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Saving" CASCADE`)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Saving" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "institution" TEXT,
        "type" TEXT NOT NULL,
        "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "color" TEXT NOT NULL DEFAULT '#10B981',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Saving_pkey" PRIMARY KEY ("id")
      )
    `)

    // Create SavingDeposit table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SavingDeposit" (
        "id" TEXT NOT NULL,
        "savingId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "note" TEXT,
        "date" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SavingDeposit_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "SavingDeposit_savingId_fkey" FOREIGN KEY ("savingId") REFERENCES "Saving"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)

    return NextResponse.json({ ok: true, message: "v2 migration applied" })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
