import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Fetch first to reverse wallet balance if linked
  const tx = await prisma.transaction.findUnique({ where: { id } })
  if (!tx || tx.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (tx?.walletId) {
    // Reverse: income was +, so reverse is -; expense was -, so reverse is +
    const balanceDelta = tx.type === "income" ? -tx.amount : tx.amount
    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: balanceDelta } },
      }),
    ])
  } else {
    await prisma.transaction.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}
