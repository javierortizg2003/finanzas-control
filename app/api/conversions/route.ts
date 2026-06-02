import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletId = searchParams.get("walletId")

  if (walletId) {
    const conversions = await prisma.currencyConversion.findMany({
      where: {
        OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
      },
      orderBy: { date: "desc" },
      include: {
        fromWallet: { select: { id: true, name: true, currency: true } },
        toWallet: { select: { id: true, name: true, currency: true } },
      },
    })
    return NextResponse.json(conversions)
  }

  const conversions = await prisma.currencyConversion.findMany({
    orderBy: { date: "desc" },
    include: {
      fromWallet: { select: { id: true, name: true, currency: true } },
      toWallet: { select: { id: true, name: true, currency: true } },
    },
  })
  return NextResponse.json(conversions)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    fromWalletId, toWalletId, amountFrom, amountTo, exchangeRate, description, date,
  } = body

  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { id: fromWalletId } }),
    prisma.wallet.findUnique({ where: { id: toWalletId } }),
  ])

  if (!fromWallet || !toWallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
  }

  const conversion = await prisma.$transaction([
    prisma.currencyConversion.create({
      data: {
        fromWalletId,
        toWalletId,
        amountFrom: parseFloat(amountFrom),
        amountTo: parseFloat(amountTo),
        exchangeRate: parseFloat(exchangeRate),
        description,
        date: new Date(date),
      },
      include: {
        fromWallet: { select: { id: true, name: true, currency: true } },
        toWallet: { select: { id: true, name: true, currency: true } },
      },
    }),
    // Decrease from wallet
    prisma.wallet.update({
      where: { id: fromWalletId },
      data: { balance: { decrement: parseFloat(amountFrom) } },
    }),
    // Increase to wallet
    prisma.wallet.update({
      where: { id: toWalletId },
      data: { balance: { increment: parseFloat(amountTo) } },
    }),
  ])

  return NextResponse.json(conversion[0], { status: 201 })
}
