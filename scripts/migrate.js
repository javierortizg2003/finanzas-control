// Runs prisma db push using the unpooled URL (needed for migrations)
// Falls back to DATABASE_URL if DATABASE_URL_UNPOOLED is not set
const { execSync } = require("child_process")

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!url) {
  console.log("No DATABASE_URL found, skipping db push")
  process.exit(0)
}

console.log("Running prisma db push...")
try {
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  })
  console.log("Database schema applied successfully")
} catch (err) {
  console.error("db push failed:", err.message)
  process.exit(1)
}
