import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const { depositId } = await params
  const dep = await prisma.savingDeposit.findUnique({ where: { id: depositId } })

  if (dep?.walletId) {
    // Reverse: if deposit was +1000 (wallet -1000), restore with +1000
    // if withdrawal was -500 (wallet +500), restore with -500
    await prisma.$transaction([
      prisma.savingDeposit.delete({ where: { id: depositId } }),
      prisma.wallet.update({
        where: { id: dep.walletId },
        data: { balance: { increment: dep.amount } },
      }),
    ])
  } else {
    await prisma.savingDeposit.delete({ where: { id: depositId } })
  }

  return NextResponse.json({ success: true })
}
