import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL);

console.log("🔄 Aplicando cambios al schema Debt...\n");

await sql`
  ALTER TABLE "Debt"
    ADD COLUMN IF NOT EXISTS "termMonths"    INTEGER,
    ADD COLUMN IF NOT EXISTS "lifeInsurance" DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "debtInsurance" DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "isMixedRate"   BOOLEAN NOT NULL DEFAULT false
`;

console.log("✅ Campos agregados a Debt: termMonths, lifeInsurance, debtInsurance, isMixedRate");
