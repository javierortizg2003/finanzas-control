# Estado Actual — FinanzasControl
**Fecha:** 2026-06-03  
**Stack:** Next.js 16.2 (App Router) · React 19 · Prisma 7.8 · Neon PostgreSQL · Clerk Auth · Tailwind 4

---

## 1. Esquema de Datos (`prisma/schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../app/generated/prisma"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
}

// Wallet types: CREDIT_CARD | DEBIT_CARD | CASH | BANK_ACCOUNT | SAVINGS | INVESTMENT | EMERGENCY_FUND
model Wallet {
  id             String        @id @default(cuid())
  userId         String
  name           String
  type           String
  bank           String?
  currency       String        @default("MXN")
  balance        Float         @default(0)
  initialBalance Float?        @default(0)
  creditLimit    Float?
  color          String        @default("#10B981")
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  transactions   Transaction[]
  transfersOut   Transfer[]          @relation("TransferFrom")
  transfersIn    Transfer[]          @relation("TransferTo")
  savingDeposits SavingDeposit[]
  conversionsOut CurrencyConversion[] @relation("ConvertFrom")
  conversionsIn  CurrencyConversion[] @relation("ConvertTo")
}

model Transfer {
  id           String   @id @default(cuid())
  fromWalletId String
  toWalletId   String
  amount       Float
  description  String?
  date         DateTime
  createdAt    DateTime @default(now())
  fromWallet   Wallet   @relation("TransferFrom", fields: [fromWalletId], references: [id])
  toWallet     Wallet   @relation("TransferTo", fields: [toWalletId], references: [id])
}

model CurrencyConversion {
  id              String   @id @default(cuid())
  fromWalletId    String
  toWalletId      String
  amountFrom      Float
  amountTo        Float
  exchangeRate    Float
  description     String?
  date            DateTime
  createdAt       DateTime @default(now())
  fromWallet      Wallet   @relation("ConvertFrom", fields: [fromWalletId], references: [id])
  toWallet        Wallet   @relation("ConvertTo", fields: [toWalletId], references: [id])
}

model Transaction {
  id          String   @id @default(cuid())
  userId      String
  type        String   // "income" | "expense"
  amount      Float
  category    String
  description String?
  date        DateTime
  walletId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  wallet      Wallet?  @relation(fields: [walletId], references: [id])
}

model Saving {
  id           String          @id @default(cuid())
  userId       String
  name         String
  institution  String?
  type         String
  interestRate Float           @default(0)
  color        String          @default("#10B981")
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  deposits     SavingDeposit[]
}

model SavingDeposit {
  id        String   @id @default(cuid())
  savingId  String
  amount    Float    // positive = depósito, negative = retiro
  note      String?
  date      DateTime
  walletId  String?
  createdAt DateTime @default(now())
  saving    Saving   @relation(fields: [savingId], references: [id], onDelete: Cascade)
  wallet    Wallet?  @relation(fields: [walletId], references: [id])
}

model Debt {
  id              String   @id @default(cuid())
  userId          String
  name            String
  balance         Float    // saldo actual
  originalBalance Float    // saldo al momento de registrar
  interestRate    Float    // tasa anual %
  minimumPayment  Float
  type            String   @default("other")
  termMonths      Int?     // plazo en meses (opcional)
  lifeInsurance   Float?   @default(0)
  debtInsurance   Float?   @default(0)
  isMixedRate     Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Goal {
  id            String    @id @default(cuid())
  userId        String
  name          String
  description   String?
  targetAmount  Float
  currentAmount Float     @default(0)
  deadline      DateTime?
  category      String?
  color         String    @default("#10B981")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// Asset types: REAL_ESTATE | VEHICLE | OTHER
model Asset {
  id           String   @id @default(cuid())
  userId       String
  name         String
  type         String
  currentValue Float
  description  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Notas críticas del schema:**
- `Transfer` y `CurrencyConversion` **no tienen `userId`** directo — se scoping a través de `Wallet.userId`.
- `SavingDeposit` tampoco tiene `userId` — se scoping a través de `Saving.userId`.
- `Wallet.currency` fue agregado tardíamente; carteras antiguas en BD tienen `"MXN"` hardcodeado porque el API no lo guardaba al principio.
- `Wallet.initialBalance` se guarda igual que `balance` al crear — no hay lógica posterior que lo actualice, así que no sirve aún para calcular rendimiento.
- `Debt.balance` es el saldo actual pero **no se actualiza automáticamente** cuando se registran pagos. Es campo manual.

---

## 2. Mapa de Navegación y Vistas

### Rutas públicas
| Ruta | Descripción | BD |
|------|-----------|----|
| `/` | Landing page. Sin sesión muestra "Crear Cuenta / Iniciar Sesión". Con sesión redirige a `/dashboard`. | No |
| `/sign-in` | Pantalla Clerk (Google + email). Sin sidebar. | No |
| `/sign-up` | Pantalla Clerk. Sin sidebar. | No |

### Rutas protegidas (grupo `(app)/`, requieren auth Clerk)

| Ruta | Descripción | Conectada a BD |
|------|-------------|---------------|
| `/dashboard` | Dashboard principal. Carga `/api/stats` (agrega transactions, savings, goals, wallets por userId). Muestra 5 stat cards, gráfico de barras 6 meses, pie de ahorros, gastos por categoría, transacciones recientes. Incluye `QuickExpenseForm`. | ✅ Sí |
| `/carteras` | Lista de wallets con saldos. Formulario de creación (incluye `creditLimit` condicional para CREDIT_CARD). Tarjetas con barra de progreso de crédito (azul → naranja →rojo según % de uso). Transferencias y conversiones entre carteras. | ✅ Sí |
| `/carteras/[id]` | Estado de cuenta de una cartera: movimientos cronológicos (transactions + transfers in/out), saldo corriente calculado hacia atrás. | ✅ Sí |
| `/ingresos` | Lista de transacciones `type=income`. Formulario de alta con categoría y cartera. | ✅ Sí |
| `/gastos` | Lista de transacciones `type=expense`. Formulario de alta con categoría y cartera. | ✅ Sí |
| `/ahorros` | Cuentas de ahorro/inversión con tasa de interés. Depósitos y retiros. Calcula valor actual con interés compuesto por depósito (`calculateSavingCurrentValue` en `lib/utils`). | ✅ Sí |
| `/deudas` | Dashboard de extinción de deudas. Switch Bola de Nieve / Avalancha. Input de pago extra. Gráfico de barras horizontal con meses por deuda. Cards clicables que abren el detalle. | ✅ Sí |
| `/deudas/[id]` | Detalle de una deuda: desglose mensual (cuota base + seguros + extra), validación de seguro ilógico (>20% de cuota), tabla de amortización con `AmortizationTable`. Input de pago extra para simular. | ✅ Sí |
| `/metas` | Metas financieras con barra de progreso. Formulario de alta. Botón de abonar. | ✅ Sí |
| `/presupuesto` | Calculadora de presupuesto (50/30/20, 70/20/10, etc.) y número FIRE. **Completamente estática** — inputs manuales, sin conexión a transacciones reales. | ❌ No (manual) |
| `/calculadora` | Dos pestañas: **Ahorro** (proyección interés compuesto, tabla anual, metas de ahorro mensual) y **Préstamo** (amortización francesa, contado vs financiado, inversión alternativa al 7%). Completamente local, sin BD. | ❌ No (calculadora local) |
| `/activos` | Página base vacía. Muestra 3 categorías (Bien Raíz, Vehículo, Otro) con valores en $0. Botón "Agregar Activo" sin funcionalidad. | ❌ No (sin implementar) |
| `/configuracion` | Toggles de tema (claro/oscuro), moneda por defecto, notificaciones, idioma. Todo persiste en `localStorage`. No hay relación con BD ni con el sistema real de monedas. | ❌ localStorage solamente |

---

## 3. Componentes Globales y Lógica Compartida

### Providers y contexto
| Componente | Ubicación | Función |
|-----------|----------|---------|
| `ClerkProvider` | `app/layout.tsx` | Auth global. Envuelve toda la app. |
| `PrivacyProvider` | `components/providers/PrivacyProvider.tsx` | Context con `isPrivate: boolean`. Persiste en `localStorage("privacy-mode")`. Expone `togglePrivacy()`. |

### Componentes de UI
| Componente | Función | Notas |
|-----------|---------|-------|
| `Navigation` | Sidebar desktop + bottom nav mobile. Incluye `ThemeToggle`, botón de privacidad (ojo), `UserButton` de Clerk. | Activo en todas las rutas `(app)/`. |
| `ThemeToggle` | Toggle oscuro/claro vía `localStorage` y clase CSS en `<html>`. | El tema claro no afecta backgrounds con colores inline (`style={{ background: "#060D1F" }}`). Bug conocido. |
| `MaskedAmount` | Renderiza `formatCurrency(amount, currency)` o `•••••` según `isPrivate`. | Implementado en dashboard. **Pendiente aplicar en carteras, ingresos, gastos, ahorros, metas, deudas.** |
| `QuickExpenseForm` | Formulario compacto en el dashboard. Carga wallets del usuario, POST a `/api/transactions`, llama `router.refresh()`. | Funcional. |
| `AmortizationTable` | Tabla de amortización francesa. Props: `principal, annualRate, months, lifeIns, debtIns, extraPayment`. Se detiene cuando `balance ≤ 0.01`. Muestra resumen + tabla paginada (12 filas → toggle ver todo). | Usado en `/deudas/[id]` y `/calculadora`. |

### Lógica compartida (`lib/utils.ts`)
| Función | Descripción |
|---------|-------------|
| `formatCurrency(amount, currency?)` | `Intl.NumberFormat("es-MX")`. Default `"MXN"`. |
| `calculateSavingCurrentValue(deposits, annualRate)` | Interés compuesto mensual por depósito individual, sumado. |
| `calculateHealthScore({monthlyIncome, monthlyExpenses, totalSavings, avgGoalProgress})` | Score 0-100 ponderado. Retorna número. |
| `getHealthLabel(score)` | Retorna `{ label: string, color: string }`. |
| `calculateCompoundInterest(initial, monthly, rate, years)` | Array año a año para gráfico de ahorro. |
| `WALLET_TYPES` | Array con `value, label, icon, color`. Tipos: `BANK_ACCOUNT, SAVINGS, INVESTMENT, CASH, CREDIT_CARD, DEBIT_CARD, EMERGENCY_FUND`. |
| `BUDGET_METHODS` | Métodos de presupuesto (50/30/20, 70/20/10, etc.) con proporciones. |

### API Routes (`app/api/`)
Todas autenticadas con `auth()` de Clerk. Filtran por `userId`.

| Endpoint | Operaciones |
|----------|------------|
| `/api/wallets` | GET (con transactions), POST |
| `/api/wallets/[id]` | PUT, DELETE (verifica ownership) |
| `/api/wallets/[id]/history` | GET — estado de cuenta cronológico con saldo running |
| `/api/transactions` | GET (filtro `?type=`, `?limit=`), POST (actualiza balance de wallet atómicamente) |
| `/api/transactions/[id]` | DELETE (reversa balance) |
| `/api/savings` | GET, POST |
| `/api/savings/[id]` | DELETE |
| `/api/savings/[id]/deposits` | GET, POST (actualiza wallet atómicamente) |
| `/api/savings/[id]/deposits/[depositId]` | DELETE (reversa wallet) |
| `/api/debts` | GET, POST |
| `/api/debts/[id]` | PUT, DELETE |
| `/api/goals` | GET, POST |
| `/api/goals/[id]` | PATCH (incrementar currentAmount), PUT (edición completa), DELETE |
| `/api/transfers` | GET (filtrado por wallet.userId), POST (atómico) |
| `/api/conversions` | GET, POST (atómico) |
| `/api/stats` | GET — agrega todo en un solo endpoint para el dashboard |

**Sin API:** `Asset` no tiene ninguna ruta implementada.

---

## 4. Bugs y Deuda Técnica Conocida

### Críticos (afectan datos)
- **`Debt.balance` es manual.** No existe mecanismo para registrar pagos y reducir el saldo automáticamente. El usuario debe editar el balance a mano. Consecuencia: la simulación de bola de nieve usa el saldo capturado al momento del registro, no el saldo real actualizado.
- **`Wallet.currency` fue ignorado al crear.** Las wallets creadas antes del fix `[id]` tienen `currency = "MXN"` en BD aunque el usuario haya seleccionado USD. El API PUT (edición) sí guarda la moneda correcta, pero las existentes necesitan corrección manual o una migración de datos.
- **`formatCurrency` usa locale `"es-MX"` siempre.** USD se muestra como `"US$ 100.00"` en vez de `"$100.00"`. Visualmente confuso para wallets en dólar.

### Deuda técnica de datos
- **`Transfer` y `CurrencyConversion` sin `userId`:** El scoping se hace a través de `Wallet.userId`, lo que funciona, pero no permite queries directas por usuario sin joins. Si se necesita historial global de transferencias es ineficiente.
- **`Wallet.initialBalance`:** Se guarda como copia de `balance` al crear. No cumple su propósito (medir rendimiento de inversiones) porque no existe lógica para diferenciarlo del balance actual.
- **`Debt.originalBalance`:** Se guarda igual que `balance` al crear. Sin actualización automática tras pagos, no refleja el capital amortizado real.

### UI / UX
- **Modo claro roto:** `ThemeToggle` togglea la clase `.light` en `<html>`, pero la mayoría de fondos usan `style={{ background: "#060D1F" }}` (inline) que no responde a clases CSS. Solo afecta las clases de Tailwind.
- **`MaskedAmount` aplicado solo en dashboard.** Las páginas de `/carteras`, `/ingresos`, `/gastos`, `/ahorros`, `/metas`, `/deudas` siguen mostrando montos en claro aunque el modo privacidad esté activo.
- **`QuickExpenseForm` moneda fija.** Muestra los montos en MXN (usa `formatCurrency` sin la moneda de la cartera seleccionada).

### Funcionalidad pendiente / no implementada
- **`/activos`:** La tabla `Asset` existe en BD y en Prisma, pero no hay API (`/api/assets`) ni formulario de alta. La página es placeholder visual.
- **`/presupuesto`:** No lee las transacciones reales del usuario. Debería conectarse a `/api/stats` para usar ingresos/gastos reales como base del presupuesto 50/30/20 y el cálculo FIRE.
- **`/configuracion`:** La moneda preferida se guarda en `localStorage` pero `formatCurrency` no la lee — no tiene efecto en la app. El idioma y notificaciones tampoco están conectados a ninguna lógica.
- **Modo Avalancha en deudas:** Matemáticamente implementado, pero la lógica de "roll" del extra no distingue si la estrategia cambió — siempre aplica el extra al primer elemento de la lista ordenada, lo cual es correcto, pero si una deuda se paga, el roll debería recalcular. Actualmente se recalcula correctamente via `useMemo`, pero la simulación ignora los seguros de las deudas (solo usa `minimumPayment`).
- **Tabla de amortización y saldo real:** `AmortizationTable` usa `debt.balance` (saldo actual) como `principal`, no el saldo original del préstamo. Esto es correcto para mostrar "cuánto queda", pero la cuota calculada no coincide con la cuota bancaria original si el usuario ya amortizó capital.
- **Historial de cuenta (`/carteras/[id]`):** No incluye `CurrencyConversion` en los movimientos, solo `Transaction` y `Transfer`.
- **Sin paginación en ningún listado.** `GET /api/transactions` devuelve todo sin límite (excepto `?limit=`). Con muchos registros, `/api/stats` puede ser lento ya que carga todas las transacciones del usuario en memoria.

---

## 5. Infraestructura

- **BD:** Neon PostgreSQL (serverless). Conexión via `@prisma/adapter-neon` (WebSockets/HTTPS port 443). El puerto 5432 TCP está bloqueado en el entorno de desarrollo — `prisma db push` no funciona directamente. Las migraciones se aplican con `node scripts/migrate.mjs` (usa `@neondatabase/serverless` sobre HTTPS).
- **Auth:** Clerk (app ID: `app_3EdGrg2JAoYbut09QSUZHZeHZAR`). Instancia de desarrollo. Google OAuth + email habilitados.
- **Middleware:** `proxy.ts` (Next.js 16 deprecó `middleware.ts`). Las rutas API retornan 401 si no hay sesión; las rutas de página redirigen a `/sign-in`.
- **Deploy:** Vercel (proyecto `finanzas-control`). Variables de entorno en `.env.local` vía `vercel env pull`.
