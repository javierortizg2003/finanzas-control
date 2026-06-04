import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL);

console.log("🔄 Aplicando migración: ExchangeRate + UserPreference...\n");

await sql`
  CREATE TABLE IF NOT EXISTS "ExchangeRate" (
    "id"           TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency"   TEXT NOT NULL,
    "rate"         DOUBLE PRECISION NOT NULL,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExchangeRate_fromCurrency_toCurrency_key"
      UNIQUE ("fromCurrency", "toCurrency")
  )
`;
console.log("✅ Tabla ExchangeRate creada (o ya existía)");

await sql`
  CREATE TABLE IF NOT EXISTS "UserPreference" (
    "userId"       TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'MXN',
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
  )
`;
console.log("✅ Tabla UserPreference creada (o ya existía)");

console.log("\n✨ Migración completada.");
