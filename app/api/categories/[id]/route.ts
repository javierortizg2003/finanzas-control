import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: { macro?: string | null; name?: string; color?: string } = {}
  if ("macro" in body) data.macro = body.macro ?? null
  if (body.name?.trim()) data.name = body.name.trim()
  if (body.color) data.color = body.color

  const updated = await prisma.category.update({
    where: { id },
    data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
