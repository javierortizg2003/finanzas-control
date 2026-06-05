import { prisma } from "@/lib/prisma"

const CURRENCIES = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "BTC", "ETH"]
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Fetches all rates using USD as base, then derives all cross-pairs.
// Results are cached in the ExchangeRate table for CACHE_TTL_MS.
export async function getExchangeRates(): Promise<Map<string, number>> {
  const stored = await prisma.exchangeRate.findMany()
  const rateMap = new Map<string, number>()

  // Use cache if it's still fresh
  if (stored.length > 0) {
    const oldest = Math.min(...stored.map((r) => r.updatedAt.getTime()))
    if (Date.now() - oldest < CACHE_TTL_MS) {
      for (const r of stored) rateMap.set(`${r.fromCurrency}→${r.toCurrency}`, r.rate)
      return rateMap
    }
  }

  // Fetch fresh rates with USD as base
  const usdRates = await fetchUsdRates()
  if (usdRates === null) {
    // API unavailable — fall back to whatever is cached
    for (const r of stored) rateMap.set(`${r.fromCurrency}→${r.toCurrency}`, r.rate)
    return rateMap
  }

  // Derive all cross-pairs: A→B = (USD→B) / (USD→A)
  const upserts: { fromCurrency: string; toCurrency: string; rate: number }[] = []
  for (const from of CURRENCIES) {
    for (const to of CURRENCIES) {
      if (from === to) continue
      const rateFromUsd = usdRates[from.toLowerCase()]
      const rateToUsd   = usdRates[to.toLowerCase()]
      if (!rateFromUsd || !rateToUsd) continue
      const rate = rateToUsd / rateFromUsd
      rateMap.set(`${from}→${to}`, rate)
      upserts.push({ fromCurrency: from, toCurrency: to, rate })
    }
  }

  // Persist in DB (best-effort — don't fail stats if this fails)
  await Promise.all(
    upserts.map((u) =>
      prisma.exchangeRate.upsert({
        where:  { fromCurrency_toCurrency: { fromCurrency: u.fromCurrency, toCurrency: u.toCurrency } },
        create: u,
        update: { rate: u.rate },
      }).catch(() => null)
    )
  )

  return rateMap
}

async function fetchUsdRates(): Promise<Record<string, number> | null> {
  const urls = [
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) continue
      const data = await res.json()
      if (data?.usd && typeof data.usd === "object") return data.usd as Record<string, number>
    } catch {
      // try next URL
    }
  }
  return null
}
