import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const { depositId } = await params
  await prisma.savingDeposit.delete({ where: { id: depositId } })
  return NextResponse.json({ success: true })
}
