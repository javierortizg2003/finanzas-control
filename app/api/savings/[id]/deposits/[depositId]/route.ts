import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, depositId } = await params
  const saving = await prisma.saving.findUnique({ where: { id } })
  if (!saving || saving.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const dep = await prisma.savingDeposit.findUnique({ where: { id: depositId } })
  if (!dep || dep.savingId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

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
