import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL);

console.log("🔄 Ajustando FK constraints de Wallet con ON DELETE CASCADE / SET NULL...\n");

// ── Transaction.walletId → CASCADE ───────────────────────────────────────────
await sql`
  ALTER TABLE "Transaction"
    DROP CONSTRAINT IF EXISTS "Transaction_walletId_fkey"
`;
await sql`
  ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_walletId_fkey"
      FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
`;
console.log('✅ Transaction_walletId_fkey → CASCADE');

// ── Transfer.fromWalletId → CASCADE ─────────────────────────────────────────
await sql`
  ALTER TABLE "Transfer"
    DROP CONSTRAINT IF EXISTS "Transfer_fromWalletId_fkey"
`;
await sql`
  ALTER TABLE "Transfer"
    ADD CONSTRAINT "Transfer_fromWalletId_fkey"
      FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
`;
console.log('✅ Transfer_fromWalletId_fkey → CASCADE');

// ── Transfer.toWalletId → CASCADE ────────────────────────────────────────────
await sql`
  ALTER TABLE "Transfer"
    DROP CONSTRAINT IF EXISTS "Transfer_toWalletId_fkey"
`;
await sql`
  ALTER TABLE "Transfer"
    ADD CONSTRAINT "Transfer_toWalletId_fkey"
      FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
`;
console.log('✅ Transfer_toWalletId_fkey → CASCADE');

// ── CurrencyConversion.fromWalletId → CASCADE ────────────────────────────────
await sql`
  ALTER TABLE "CurrencyConversion"
    DROP CONSTRAINT IF EXISTS "CurrencyConversion_fromWalletId_fkey"
`;
await sql`
  ALTER TABLE "CurrencyConversion"
    ADD CONSTRAINT "CurrencyConversion_fromWalletId_fkey"
      FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
`;
console.log('✅ CurrencyConversion_fromWalletId_fkey → CASCADE');

// ── CurrencyConversion.toWalletId → CASCADE ──────────────────────────────────
await sql`
  ALTER TABLE "CurrencyConversion"
    DROP CONSTRAINT IF EXISTS "CurrencyConversion_toWalletId_fkey"
`;
await sql`
  ALTER TABLE "CurrencyConversion"
    ADD CONSTRAINT "CurrencyConversion_toWalletId_fkey"
      FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
`;
console.log('✅ CurrencyConversion_toWalletId_fkey → CASCADE');

// ── SavingDeposit.walletId → SET NULL ────────────────────────────────────────
// walletId es opcional: el depósito pertenece al Saving, no a la cartera.
// Se limpia el vínculo sin borrar el registro histórico del depósito.
await sql`
  ALTER TABLE "SavingDeposit"
    DROP CONSTRAINT IF EXISTS "SavingDeposit_walletId_fkey"
`;
await sql`
  ALTER TABLE "SavingDeposit"
    ADD CONSTRAINT "SavingDeposit_walletId_fkey"
      FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
`;
console.log('✅ SavingDeposit_walletId_fkey → SET NULL');

console.log("\n✨ Migración completada. Las FK de Wallet ya tienen las reglas de cascade correctas.");
