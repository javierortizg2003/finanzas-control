import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const walletId = searchParams.get("walletId")

  if (walletId) {
    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
    if (!wallet || wallet.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

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
    where: {
      fromWallet: { userId },
    },
    orderBy: { date: "desc" },
    include: {
      fromWallet: { select: { id: true, name: true, currency: true } },
      toWallet: { select: { id: true, name: true, currency: true } },
    },
  })
  return NextResponse.json(conversions)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const {
    fromWalletId, toWalletId, amountFrom, amountTo, exchangeRate, description, date,
  } = body

  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { id: fromWalletId } }),
    prisma.wallet.findUnique({ where: { id: toWalletId } }),
  ])

  if (!fromWallet || fromWallet.userId !== userId || !toWallet || toWallet.userId !== userId) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
  }

  const [conversion] = await prisma.$transaction([
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

  // Auto-record the exchange rate so /api/stats can use it for conversions
  await prisma.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency: {
        fromCurrency: fromWallet.currency,
        toCurrency: toWallet.currency,
      },
    },
    create: {
      fromCurrency: fromWallet.currency,
      toCurrency: toWallet.currency,
      rate: parseFloat(exchangeRate),
    },
    update: { rate: parseFloat(exchangeRate) },
  })

  return NextResponse.json(conversion, { status: 201 })
}
