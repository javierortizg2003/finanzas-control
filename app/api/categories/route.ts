import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

const EXPENSE_MACRO: Record<string, string> = {
  "Alimentación":    "Necesidades",
  "Vivienda":        "Necesidades",
  "Transporte":      "Necesidades",
  "Salud":           "Necesidades",
  "Educación":       "Necesidades",
  "Servicios":       "Necesidades",
  "Deudas":          "Necesidades",
  "Entretenimiento": "Deseos",
  "Ropa":            "Deseos",
  "Suscripciones":   "Deseos",
  "Restaurantes":    "Deseos",
  "Viajes":          "Deseos",
  "Mascotas":        "Deseos",
  "Ahorro":          "Ahorro/Inversión",
  "Inversión":       "Ahorro/Inversión",
  "Otros":           "Necesidades",
}

const DEFAULT_EXPENSE = [
  { name: "Alimentación",    color: "#EF4444", macro: "Necesidades"      },
  { name: "Vivienda",        color: "#F97316", macro: "Necesidades"      },
  { name: "Transporte",      color: "#EAB308", macro: "Necesidades"      },
  { name: "Salud",           color: "#22C55E", macro: "Necesidades"      },
  { name: "Educación",       color: "#3B82F6", macro: "Necesidades"      },
  { name: "Entretenimiento", color: "#A855F7", macro: "Deseos"           },
  { name: "Ropa",            color: "#F472B6", macro: "Deseos"           },
  { name: "Servicios",       color: "#14B8A6", macro: "Necesidades"      },
  { name: "Deudas",          color: "#DC2626", macro: "Necesidades"      },
  { name: "Suscripciones",   color: "#7C3AED", macro: "Deseos"           },
  { name: "Restaurantes",    color: "#EA580C", macro: "Deseos"           },
  { name: "Viajes",          color: "#0EA5E9", macro: "Deseos"           },
  { name: "Mascotas",        color: "#84CC16", macro: "Deseos"           },
  { name: "Otros",           color: "#94A3B8", macro: "Necesidades"      },
]

const DEFAULT_INCOME = [
  { name: "Salario",     color: "#10B981" },
  { name: "Freelance",   color: "#6366F1" },
  { name: "Inversiones", color: "#F59E0B" },
  { name: "Negocio",     color: "#EC4899" },
  { name: "Renta",       color: "#14B8A6" },
  { name: "Bonos",       color: "#8B5CF6" },
  { name: "Otros",       color: "#94A3B8" },
]

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") ?? "expense"

  let categories = await prisma.category.findMany({
    where: { userId, type },
    orderBy: { createdAt: "asc" },
  })

  // Lazy-seed defaults the first time
  if (categories.length === 0) {
    const defaults = type === "income"
      ? DEFAULT_INCOME.map((c) => ({ userId, name: c.name, type, color: c.color }))
      : DEFAULT_EXPENSE.map((c) => ({ userId, name: c.name, type, color: c.color, macro: c.macro }))
    await prisma.category.createMany({ data: defaults, skipDuplicates: true })
    categories = await prisma.category.findMany({ where: { userId, type }, orderBy: { createdAt: "asc" } })
  }

  // Backfill macro for expense categories that still have null (existing users)
  if (type === "expense") {
    const needsBackfill = categories.filter((c) => c.macro === null && EXPENSE_MACRO[c.name])
    if (needsBackfill.length > 0) {
      await Promise.all(
        needsBackfill.map((c) =>
          prisma.category.update({ where: { id: c.id }, data: { macro: EXPENSE_MACRO[c.name] } })
        )
      )
      categories = await prisma.category.findMany({ where: { userId, type }, orderBy: { createdAt: "asc" } })
    }
  }

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, type, color, macro } = body

  if (!name?.trim() || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 })
  }

  try {
    const category = await prisma.category.create({
      data: { userId, name: name.trim(), type, color: color ?? "#94A3B8", macro: macro ?? null },
    })
    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: "La categoría ya existe" }, { status: 409 })
  }
}
