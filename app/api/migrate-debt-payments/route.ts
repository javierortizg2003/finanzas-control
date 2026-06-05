import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "DebtPayment" (
      "id"           TEXT NOT NULL PRIMARY KEY,
      "debtId"       TEXT NOT NULL,
      "amount"       DOUBLE PRECISION NOT NULL,
      "capital"      DOUBLE PRECISION NOT NULL,
      "interest"     DOUBLE PRECISION NOT NULL,
      "insurance"    DOUBLE PRECISION NOT NULL,
      "balanceAfter" DOUBLE PRECISION NOT NULL,
      "date"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "note"         TEXT,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DebtPayment_debtId_fkey"
        FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE
    )
  `
  return NextResponse.json({ ok: true })
}
