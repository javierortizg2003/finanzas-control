import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [wallet, transactions, transfersOut, transfersIn] = await Promise.all([
    prisma.wallet.findUnique({ where: { id } }),
    prisma.transaction.findMany({ where: { walletId: id }, orderBy: { date: "asc" } }),
    prisma.transfer.findMany({
      where: { fromWalletId: id }, orderBy: { date: "asc" },
      include: { toWallet: { select: { name: true } } },
    }),
    prisma.transfer.findMany({
      where: { toWalletId: id }, orderBy: { date: "asc" },
      include: { fromWallet: { select: { name: true } } },
    }),
  ])

  if (!wallet || wallet.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  type RawMovement = {
    id: string; date: Date; description: string; category: string
    credit: number | null; debit: number | null
  }

  const raw: RawMovement[] = [
    ...transactions.map((t) => ({
      id: t.id, date: t.date,
      description: t.description || t.category,
      category: t.category,
      credit: t.type === "income" ? t.amount : null,
      debit: t.type === "expense" ? t.amount : null,
    })),
    ...transfersOut.map((t) => ({
      id: t.id, date: t.date,
      description: `Transferencia → ${t.toWallet.name}`,
      category: "Transferencia",
      credit: null, debit: t.amount,
    })),
    ...transfersIn.map((t) => ({
      id: t.id, date: t.date,
      description: `Transferencia ← ${t.fromWallet.name}`,
      category: "Transferencia",
      credit: t.amount, debit: null,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate the balance BEFORE the first movement so the last row ends at wallet.balance
  const totalCredits = raw.reduce((s, m) => s + (m.credit ?? 0), 0)
  const totalDebits = raw.reduce((s, m) => s + (m.debit ?? 0), 0)
  let runningBalance = wallet.balance - totalCredits + totalDebits

  const movements = raw.map((m) => {
    if (m.credit) runningBalance += m.credit
    if (m.debit) runningBalance -= m.debit
    return { ...m, date: m.date.toISOString(), balance: Math.round(runningBalance * 100) / 100 }
  })

  const totalIn = raw.reduce((s, m) => s + (m.credit ?? 0), 0)
  const totalOut = raw.reduce((s, m) => s + (m.debit ?? 0), 0)

  return NextResponse.json({ wallet, movements, totalIn, totalOut })
}
