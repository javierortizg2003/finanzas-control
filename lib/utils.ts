export function formatCurrency(amount: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function getMonthName(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", { month: "short" }).format(date)
}

export function calculateCompoundInterest(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): { year: number; balance: number; contributed: number; interest: number }[] {
  const monthlyRate = annualRate / 100 / 12
  const result = []
  let balance = principal

  for (let year = 1; year <= years; year++) {
    const contributed = monthlyContribution * 12 * year + principal
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution
    }
    result.push({
      year,
      balance: Math.round(balance * 100) / 100,
      contributed: Math.round(contributed * 100) / 100,
      interest: Math.round((balance - contributed) * 100) / 100,
    })
  }

  return result
}

export function calculateFIRENumber(monthlyExpenses: number): number {
  return monthlyExpenses * 12 * 25
}

export function calculateYearsToFIRE(
  currentSavings: number,
  monthlyContribution: number,
  monthlyExpenses: number,
  annualReturn = 7
): number {
  const fireNumber = calculateFIRENumber(monthlyExpenses)
  if (currentSavings >= fireNumber) return 0
  const monthlyRate = annualReturn / 100 / 12
  let balance = currentSavings
  let months = 0
  while (balance < fireNumber && months < 1200) {
    balance = balance * (1 + monthlyRate) + monthlyContribution
    months++
  }
  return Math.round((months / 12) * 10) / 10
}

export function calculateHealthScore({
  monthlyIncome,
  monthlyExpenses,
  totalSavings,
  avgGoalProgress,
}: {
  monthlyIncome: number
  monthlyExpenses: number
  totalSavings: number
  avgGoalProgress: number
}): number {
  let score = 0

  // Cash flow: 0-20 pts
  if (monthlyIncome > 0) {
    const cashFlow = (monthlyIncome - monthlyExpenses) / monthlyIncome
    score += Math.max(0, Math.min(20, cashFlow * 40))
  }

  // Savings rate: 0-30 pts
  if (monthlyIncome > 0) {
    const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome
    score += Math.max(0, Math.min(30, savingsRate * 150))
  }

  // Emergency fund (savings / monthly expenses): 0-30 pts
  if (monthlyExpenses > 0) {
    const emergencyMonths = totalSavings / monthlyExpenses
    score += Math.min(30, emergencyMonths * 5)
  }

  // Goals progress: 0-20 pts
  score += Math.min(20, avgGoalProgress * 20)

  return Math.min(100, Math.round(score))
}

export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excelente", color: "text-emerald-400" }
  if (score >= 60) return { label: "Bueno", color: "text-blue-400" }
  if (score >= 40) return { label: "Regular", color: "text-amber-400" }
  return { label: "Necesita mejora", color: "text-red-400" }
}

export const INCOME_CATEGORIES = [
  "Salario",
  "Freelance",
  "Inversiones",
  "Negocio",
  "Renta",
  "Bonos",
  "Otros",
]

export const EXPENSE_CATEGORIES = [
  "Alimentación",
  "Vivienda",
  "Transporte",
  "Salud",
  "Educación",
  "Entretenimiento",
  "Ropa",
  "Servicios",
  "Deudas",
  "Suscripciones",
  "Restaurantes",
  "Viajes",
  "Mascotas",
  "Otros",
]

export const SAVING_TYPES = [
  "Cuenta Bancaria",
  "CETES / Bonos",
  "Inversiones",
  "Fondo de Emergencia",
  "Crypto",
  "Efectivo",
  "Afore / Pensión",
  "Bienes Raíces",
  "Otros",
]

export const CATEGORY_COLORS: Record<string, string> = {
  Salario: "#10B981",
  Freelance: "#6366F1",
  Inversiones: "#F59E0B",
  Negocio: "#EC4899",
  Renta: "#14B8A6",
  Bonos: "#8B5CF6",
  Otros: "#94A3B8",
  Alimentación: "#EF4444",
  Vivienda: "#F97316",
  Transporte: "#EAB308",
  Salud: "#22C55E",
  Educación: "#3B82F6",
  Entretenimiento: "#A855F7",
  Ropa: "#F472B6",
  Servicios: "#14B8A6",
  Deudas: "#DC2626",
  Suscripciones: "#7C3AED",
  Restaurantes: "#EA580C",
  Viajes: "#0EA5E9",
  Mascotas: "#84CC16",
  "Cuenta Bancaria": "#10B981",
  "CETES / Bonos": "#F59E0B",
  Crypto: "#F97316",
  "Fondo de Emergencia": "#22C55E",
  Efectivo: "#94A3B8",
  "Afore / Pensión": "#6366F1",
  "Bienes Raíces": "#A855F7",
}

export const BUDGET_METHODS = {
  "50-30-20": {
    name: "Regla 50/30/20",
    description:
      "El método más popular para organizar tus finanzas. Divide tu ingreso en necesidades, deseos y ahorro.",
    categories: [
      {
        name: "Necesidades",
        percent: 50,
        color: "#10B981",
        icon: "🏠",
        examples: "Vivienda, comida, transporte, servicios, deudas mínimas",
      },
      {
        name: "Deseos",
        percent: 30,
        color: "#6366F1",
        icon: "🎯",
        examples: "Entretenimiento, restaurantes, hobbies, suscripciones",
      },
      {
        name: "Ahorro e Inversión",
        percent: 20,
        color: "#F59E0B",
        icon: "💰",
        examples: "Fondo de emergencia, inversiones, retiro, metas",
      },
    ],
  },
  "70-20-10": {
    name: "Regla 70/20/10",
    description:
      "Versión adaptada para quienes recién empiezan. Prioriza gastos de vida con un porcentaje mayor.",
    categories: [
      {
        name: "Gastos de Vida",
        percent: 70,
        color: "#10B981",
        icon: "🏠",
        examples: "Todo lo necesario para vivir día a día",
      },
      {
        name: "Ahorro",
        percent: 20,
        color: "#F59E0B",
        icon: "💰",
        examples: "Fondo de emergencia, metas de ahorro",
      },
      {
        name: "Inversión o Deuda",
        percent: 10,
        color: "#6366F1",
        icon: "📈",
        examples: "Pagar deuda extra o empezar a invertir",
      },
    ],
  },
  fire: {
    name: "Método FIRE",
    description:
      "Financial Independence, Retire Early. Ahorra agresivamente para alcanzar la libertad financiera antes.",
    categories: [
      {
        name: "Gastos Esenciales",
        percent: 40,
        color: "#10B981",
        icon: "🏠",
        examples: "Solo lo indispensable: vivienda, comida, servicios",
      },
      {
        name: "Gastos Flexibles",
        percent: 10,
        color: "#6366F1",
        icon: "🎯",
        examples: "Entretenimiento mínimo y gastos personales",
      },
      {
        name: "Ahorro Activo",
        percent: 30,
        color: "#F59E0B",
        icon: "💰",
        examples: "Fondo de emergencia (6 meses), inversiones",
      },
      {
        name: "Inversión Agresiva",
        percent: 20,
        color: "#EC4899",
        icon: "🚀",
        examples: "ETFs, acciones, bienes raíces, CETES, Afore voluntario",
      },
    ],
  },
  "latam-optimized": {
    name: "Optimizado LATAM",
    description:
      "Adaptado para el contexto latinoamericano: considera inflación, acceso a crédito y opciones de inversión locales.",
    categories: [
      {
        name: "Necesidades",
        percent: 45,
        color: "#10B981",
        icon: "🏠",
        examples: "Vivienda, alimentación, transporte, servicios básicos",
      },
      {
        name: "Deseos",
        percent: 15,
        color: "#6366F1",
        icon: "🎯",
        examples: "Ocio, restaurantes, ropa no esencial",
      },
      {
        name: "Fondo de Emergencia",
        percent: 10,
        color: "#22C55E",
        icon: "🛡️",
        examples: "Meta: 6 meses de gastos en cuenta de fácil acceso",
      },
      {
        name: "Ahorro Largo Plazo",
        percent: 20,
        color: "#F59E0B",
        icon: "💰",
        examples: "CETES, fondos de inversión, afore voluntario",
      },
      {
        name: "Educación Financiera",
        percent: 10,
        color: "#EC4899",
        icon: "📚",
        examples: "Cursos, libros, inversión en habilidades productivas",
      },
    ],
  },
}

export const WALLET_TYPES = [
  { value: "checking", label: "Cuenta Corriente / Nómina", icon: "🏦", color: "#10B981" },
  { value: "savings", label: "Cuenta de Ahorro", icon: "💰", color: "#6366F1" },
  { value: "investment", label: "Inversión / Broker", icon: "📈", color: "#F59E0B" },
  { value: "cash", label: "Efectivo", icon: "💵", color: "#22C55E" },
  { value: "credit", label: "Tarjeta de Crédito", icon: "💳", color: "#EF4444" },
  { value: "debit", label: "Tarjeta de Débito", icon: "💳", color: "#8B5CF6" },
]

export function getWalletType(type: string) {
  return WALLET_TYPES.find((w) => w.value === type) ?? WALLET_TYPES[0]
}

function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  )
}

export function calculateDepositValue(
  amount: number,
  depositDate: string | Date,
  annualRate: number,
  atDate?: Date
): number {
  const at = atDate ?? new Date()
  const months = Math.max(0, monthsBetween(new Date(depositDate), at))
  const monthlyRate = annualRate / 100 / 12
  return amount * Math.pow(1 + monthlyRate, months)
}

export function calculateSavingCurrentValue(
  deposits: { amount: number; date: string }[],
  annualRate: number
): number {
  return deposits.reduce(
    (total, d) => total + calculateDepositValue(d.amount, d.date, annualRate),
    0
  )
}

export function generateSavingGrowthData(
  deposits: { amount: number; date: string }[],
  annualRate: number
): { label: string; principal: number; value: number; interest: number; projected: boolean }[] {
  if (deposits.length === 0) return []

  const sorted = [...deposits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const firstDate = new Date(sorted[0].date)
  const nowDate = new Date()
  const endDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 13, 1)

  const result = []
  let cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)

  while (cursor <= endDate) {
    const depositsUntilNow = sorted.filter(
      (d) => new Date(d.date) <= cursor
    )
    const principal = depositsUntilNow.reduce((s, d) => s + d.amount, 0)
    const value = depositsUntilNow.reduce(
      (s, d) => s + calculateDepositValue(d.amount, d.date, annualRate, cursor),
      0
    )
    result.push({
      label: cursor.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
      principal: Math.round(principal * 100) / 100,
      value: Math.round(value * 100) / 100,
      interest: Math.round((value - principal) * 100) / 100,
      projected: cursor > nowDate,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return result
}

export const FINANCIAL_TIPS = [
  "Paga primero a ti mismo: separa tu ahorro antes de gastar.",
  "Un fondo de emergencia de 6 meses te protege de imprevistos.",
  "La inflación erosiona tu dinero: invertir es necesario, no opcional.",
  "El interés compuesto es la 8ª maravilla del mundo. Empieza hoy.",
  "Evita las deudas de alto interés como tarjetas de crédito sin pagar.",
  "Diversifica: no pongas todos los huevos en la misma canasta.",
  "Automatiza tus ahorros para no depender de la fuerza de voluntad.",
  "Revisa tus gastos fijos cada 6 meses y elimina lo que no usas.",
  "Invierte en ti: educación y habilidades son tu mejor activo.",
  "El número FIRE = tus gastos anuales × 25. ¿Cuál es el tuyo?",
]
