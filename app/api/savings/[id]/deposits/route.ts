import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deposits = await prisma.savingDeposit.findMany({
    where: { savingId: id },
    orderBy: { date: "asc" },
    include: { wallet: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json(deposits)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const amount = parseFloat(body.amount) // positive = deposit, negative = withdrawal
  const walletId = body.walletId || null

  const depositData = {
    savingId: id,
    amount,
    note: body.note || null,
    date: new Date(body.date),
    walletId,
  }

  if (walletId) {
    // deposit: money leaves wallet (-amount). withdrawal: money enters wallet (+|amount|)
    // In both cases: wallet.balance += -amount  (deposit: -1000, withdrawal: -(-500)=+500)
    const [deposit] = await prisma.$transaction([
      prisma.savingDeposit.create({
        data: depositData,
        include: { wallet: { select: { id: true, name: true, color: true } } },
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: -amount } },
      }),
    ])
    return NextResponse.json(deposit, { status: 201 })
  }

  const deposit = await prisma.savingDeposit.create({
    data: depositData,
    include: { wallet: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json(deposit, { status: 201 })
}
