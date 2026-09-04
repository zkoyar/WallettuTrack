import { db } from "@/lib/db";
import { FALLBACK_RATES_TO_EUR } from "@/lib/currencies";
import {
  calculateBaseAmount,
  normalizeExchangeRate,
  normalizeSupportedCurrency,
} from "@/lib/financial-constraints";

const DB_TTL_MS = 24 * 60 * 60 * 1000;
const MEM_TTL_MS = 30 * 60 * 1000;

let memCache: { rates: Record<string, number>; fetchedAt: number } | null = null;

interface ErApiResponse {
  result?: string;
  rates?: Record<string, number>;
}

/**
 * Retrieves exchange rates to EUR.
 * Order: memory (30 min) → database (24 h) → external API → static fallback.
 */
export async function getRatesToEur(): Promise<Record<string, number>> {
  if (memCache && Date.now() - memCache.fetchedAt < MEM_TTL_MS) {
    return memCache.rates;
  }

  let rows: { code: string; rateToEur: unknown; fetchedAt: Date }[] = [];
  try {
    rows = await db.exchangeRate.findMany();
  } catch {
    // Database unavailable: continue with the remote API or fallback.
  }

  const validRows = rows.flatMap((row) => {
    const code = normalizeSupportedCurrency(row.code);
    const rate = normalizeExchangeRate(Number(row.rateToEur));
    return code && rate !== null ? [{ code, rate, fetchedAt: row.fetchedAt }] : [];
  });

  if (validRows.length > 3) {
    const newest = Math.max(...validRows.map((r) => r.fetchedAt.getTime()));
    const map = Object.fromEntries(validRows.map((r) => [r.code, r.rate]));
    if (Date.now() - newest < DB_TTL_MS) {
      memCache = { rates: map, fetchedAt: Date.now() };
      return map;
    }
    // Expired cache: try to refresh it, otherwise use the stale values.
    try {
      const fresh = await fetchAndStoreRates();
      return fresh;
    } catch {
      memCache = { rates: map, fetchedAt: Date.now() };
      return map;
    }
  }

  try {
    return await fetchAndStoreRates();
  } catch {
    memCache = { rates: FALLBACK_RATES_TO_EUR, fetchedAt: Date.now() };
    return FALLBACK_RATES_TO_EUR;
  }
}

async function fetchAndStoreRates(): Promise<Record<string, number>> {
  const base =
    process.env.EXCHANGE_RATE_API_BASE ?? "https://open.er-api.com/v6";
  const res = await fetch(`${base}/latest/EUR`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Exchange-rate API error ${res.status}`);
  const data = (await res.json()) as ErApiResponse;
  if (!data.rates) throw new Error("Invalid exchange-rate API response");

  // The API returns 1 EUR = rates.X, so the rate to EUR is the reciprocal.
  const ratesToEur: Record<string, number> = {};
  for (const [rawCode, rawRate] of Object.entries(data.rates)) {
    const code = normalizeSupportedCurrency(rawCode);
    const rate = normalizeExchangeRate(
      typeof rawRate === "number" ? 1 / rawRate : Number.NaN
    );
    if (code && rate !== null) ratesToEur[code] = rate;
  }

  await storeRatesBulk(ratesToEur);

  memCache = { rates: ratesToEur, fetchedAt: Date.now() };
  return ratesToEur;
}

/**
 * Stores all rates in one INSERT … ON DUPLICATE KEY query instead of one
 * upsert per currency: about 160 rows in one round trip.
 */
async function storeRatesBulk(rates: Record<string, number>): Promise<void> {
  const entries = Object.entries(rates);
  if (entries.length === 0) return;

  const placeholders: string[] = [];
  const params: string[] = [];
  for (const [code, rate] of entries) {
    placeholders.push("(?, ?, UTC_TIMESTAMP())");
    params.push(code, String(rate));
  }

  const sql = `
    INSERT INTO ExchangeRate (code, rateToEur, fetchedAt)
    VALUES ${placeholders.join(", ")} AS new_rates
    ON DUPLICATE KEY UPDATE
      rateToEur = new_rates.rateToEur,
      fetchedAt = new_rates.fetchedAt
  `;

  try {
    await db.$executeRawUnsafe(sql, ...params);
  } catch {
    // Compatible fallback: individual upserts for commonly used currencies.
    const common = ["USD", "GBP", "CHF", "JPY", "CAD", "AUD"];
    await Promise.all(
      common
        .filter((c) => rates[c] !== undefined)
        .map((c) =>
          db.exchangeRate.upsert({
            where: { code: c },
            update: { rateToEur: rates[c], fetchedAt: new Date() },
            create: { code: c, rateToEur: rates[c] },
          })
        )
    );
  }
}

/** Multiplier used to convert `from` → `to`. */
export async function getRateMultiplier(
  from: string,
  to: string
): Promise<number> {
  const normalizedFrom = normalizeSupportedCurrency(from);
  const normalizedTo = normalizeSupportedCurrency(to);
  if (!normalizedFrom || !normalizedTo) {
    throw new Error("Unsupported currency");
  }
  if (normalizedFrom === normalizedTo) return 1;
  const rates = await getRatesToEur();
  const f = normalizeExchangeRate(
    rates[normalizedFrom] ?? FALLBACK_RATES_TO_EUR[normalizedFrom]
  );
  const t = normalizeExchangeRate(
    rates[normalizedTo] ?? FALLBACK_RATES_TO_EUR[normalizedTo]
  );
  const multiplier =
    f !== null && t !== null ? normalizeExchangeRate(f / t) : null;
  if (multiplier === null) throw new Error("Exchange rate unavailable");
  return multiplier;
}

/** Converts and validates a positive financial amount for database storage. */
export async function getStoredConversion(
  amount: number,
  from: string,
  to: string
): Promise<{ amountBase: number; exchangeRate: number }> {
  const exchangeRate = await getRateMultiplier(from, to);
  const amountBase = calculateBaseAmount(amount, exchangeRate);
  if (amountBase === null) {
    throw new RangeError("Converted amount exceeds the supported range");
  }
  return { amountBase, exchangeRate };
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  const mult = await getRateMultiplier(from, to);
  const converted = amount * mult;
  if (!Number.isFinite(converted)) {
    throw new RangeError("Converted amount exceeds the supported range");
  }
  return converted;
}
