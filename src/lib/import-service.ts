import Papa from "papaparse";
import { db } from "@/lib/db";
import { getRatesToEur } from "@/lib/rates";
import { parseDateOnly } from "@/lib/dates";
import { fingerprint, type ImportedRow } from "@/lib/importers/shared";
import {
  isRevolutCsv,
  parseRevolutCsv,
  type RevolutOptions,
} from "@/lib/importers/revolut";
import {
  calculateBaseAmount,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  normalizeExchangeRate,
  normalizePositiveMoneyAmount,
  normalizeSupportedCurrency,
} from "@/lib/financial-constraints";
import { FALLBACK_RATES_TO_EUR } from "@/lib/currencies";

// Italian aliases are intentionally retained for backward-compatible imports.
const GENERIC_HEADER_MAP: Record<string, string> = {
  data: "date",
  date: "date",
  tipo: "type",
  type: "type",
  categoria: "category",
  category: "category",
  importo: "amount",
  amount: "amount",
  valuta: "currency",
  currency: "currency",
  descrizione: "description",
  description: "description",
  note: "notes",
  notes: "notes",
};

const PREVIEW_ROW_LIMIT = 100;
const LOOKUP_CHUNK_SIZE = 1_000;

type ImportSource = "revolut" | "generic";
type ImportStatus = "new" | "duplicate";

export interface ImportError {
  row: number;
  message: string;
}

export type ImportOptions = Pick<
  RevolutOptions,
  "ignoreTopup" | "ignoreExchange" | "ignoreInternal" | "ignoreRevPoints"
>;

interface CategoryChoice {
  id: string | null;
  name: string | null;
  missingName: string | null;
}

interface PreparedRow {
  row: ImportedRow;
  category: CategoryChoice;
  status: ImportStatus;
}

export interface PreparedImport {
  source: ImportSource;
  fileName: string;
  totalRows: number;
  duplicates: number;
  errors: ImportError[];
  skippedByType: Record<string, number>;
  rows: PreparedRow[];
  freshRows: PreparedRow[];
  byCategory: Record<string, number>;
}

function mapType(raw: string): "EXPENSE" | "INCOME" | null {
  const value = raw.trim().toUpperCase();
  if (["EXPENSE", "SPESA", "USCITA", "U"].includes(value)) return "EXPENSE";
  if (["INCOME", "ENTRATA", "ENTRATE", "RICAVO", "I"].includes(value)) {
    return "INCOME";
  }
  return null;
}

export function parseGenericCsv(text: string): {
  rows: ImportedRow[];
  errors: ImportError[];
} {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      GENERIC_HEADER_MAP[header.trim().toLowerCase()] ??
      header.trim().toLowerCase(),
  });

  const rows: ImportedRow[] = [];
  const errors: ImportError[] = [];

  parsed.data.forEach((row, index) => {
    const lineNumber = index + 2;
    const dateText = (row.date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      errors.push({ row: lineNumber, message: `Invalid date: "${dateText}"` });
      return;
    }

    const rawAmount = Number((row.amount ?? "").replace(",", "."));
    const amount = normalizePositiveMoneyAmount(Math.abs(rawAmount));
    if (!Number.isFinite(rawAmount) || rawAmount === 0 || amount === null) {
      errors.push({
        row: lineNumber,
        message: `Invalid amount: "${row.amount ?? ""}"`,
      });
      return;
    }

    const currency = normalizeSupportedCurrency(row.currency || "EUR");
    if (!currency) {
      errors.push({
        row: lineNumber,
        message: `Invalid currency: "${row.currency ?? ""}"`,
      });
      return;
    }

    const description = (row.description ?? "").trim() || null;
    const notes = (row.notes ?? "").trim() || null;
    const categoryName = (row.category ?? "").trim() || null;
    if (
      (description?.length ?? 0) > MAX_DESCRIPTION_LENGTH ||
      (notes?.length ?? 0) > MAX_NOTES_LENGTH ||
      (categoryName?.length ?? 0) > 50
    ) {
      errors.push({ row: lineNumber, message: "Text field is too long" });
      return;
    }
    const type =
      mapType(row.type ?? "") ?? (rawAmount > 0 ? "INCOME" : "EXPENSE");

    rows.push({
      externalId: fingerprint([
        "generic",
        dateText,
        amount.toFixed(2),
        currency,
        description,
      ]),
      type,
      amount,
      currency,
      date: parseDateOnly(dateText),
      description,
      notes,
      categoryName,
    });
  });

  return { rows, errors };
}

async function findExistingExternalIds(
  userId: string,
  accountId: string,
  ids: string[]
): Promise<Set<string>> {
  const found = new Set<string>();
  for (let index = 0; index < ids.length; index += LOOKUP_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + LOOKUP_CHUNK_SIZE);
    const transactions = await db.transaction.findMany({
      where: { userId, accountId, externalId: { in: chunk } },
      select: { externalId: true },
    });
    for (const transaction of transactions) {
      if (transaction.externalId) found.add(transaction.externalId);
    }
  }
  return found;
}

function skippedCount(stats: Record<string, number>): number {
  return Object.values(stats).reduce((total, count) => total + count, 0);
}

export async function prepareImport(input: {
  userId: string;
  accountId: string;
  fileName: string;
  text: string;
  options: ImportOptions;
}): Promise<PreparedImport> {
  const source: ImportSource = isRevolutCsv(input.text) ? "revolut" : "generic";
  const parsed =
    source === "revolut"
      ? parseRevolutCsv(input.text, {
          ...input.options,
          onlyCompleted: true,
        })
      : { ...parseGenericCsv(input.text), stats: {} as Record<string, number> };

  parsed.rows = parsed.rows.filter((row, index) => {
    const currency = normalizeSupportedCurrency(row.currency);
    const amount = normalizePositiveMoneyAmount(row.amount);
    const valid =
      currency !== null &&
      amount !== null &&
      (row.description?.length ?? 0) <= MAX_DESCRIPTION_LENGTH &&
      (row.notes?.length ?? 0) <= MAX_NOTES_LENGTH &&
      (row.categoryName?.length ?? 0) <= 50;
    if (!valid) {
      parsed.errors.push({ row: index + 2, message: "Unsupported or oversized value" });
      return false;
    }
    row.currency = currency;
    row.amount = amount;
    return true;
  });

  const ids = [...new Set(parsed.rows.map((row) => row.externalId))];
  const [existingIds, categories, rules] = await Promise.all([
    findExistingExternalIds(input.userId, input.accountId, ids),
    db.category.findMany({
      where: { userId: input.userId },
      select: { id: true, name: true },
    }),
    db.categoryRule.findMany({
      where: { userId: input.userId },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const categoriesByName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category])
  );

  const chooseCategory = (row: ImportedRow): CategoryChoice => {
    const explicit =
      source === "generic" && row.categoryName ? row.categoryName : null;
    const description = row.description?.toLowerCase() ?? "";
    const matchingRule = description
      ? rules.find((rule) => description.includes(rule.keyword.toLowerCase()))
      : undefined;

    if (explicit) {
      const existing = categoriesByName.get(explicit.toLowerCase());
      return existing
        ? { id: existing.id, name: existing.name, missingName: null }
        : { id: null, name: explicit, missingName: explicit };
    }
    if (matchingRule) {
      return {
        id: matchingRule.categoryId,
        name: matchingRule.category.name,
        missingName: null,
      };
    }
    if (row.categoryName) {
      const existing = categoriesByName.get(row.categoryName.toLowerCase());
      return existing
        ? { id: existing.id, name: existing.name, missingName: null }
        : { id: null, name: row.categoryName, missingName: row.categoryName };
    }
    return { id: null, name: null, missingName: null };
  };

  const seen = new Set<string>();
  let duplicates = 0;
  const rows = parsed.rows.map((row): PreparedRow => {
    const duplicate = existingIds.has(row.externalId) || seen.has(row.externalId);
    seen.add(row.externalId);
    if (duplicate) duplicates += 1;
    return {
      row,
      category: chooseCategory(row),
      status: duplicate ? "duplicate" : "new",
    };
  });
  const freshRows = rows.filter((row) => row.status === "new");

  const categoryCounts = new Map<string, number>();
  for (const item of freshRows) {
    if (item.category.name) {
      categoryCounts.set(
        item.category.name,
        (categoryCounts.get(item.category.name) ?? 0) + 1
      );
    }
  }

  return {
    source,
    fileName: input.fileName.trim().slice(0, 191) || "import.csv",
    totalRows:
      parsed.rows.length + parsed.errors.length + skippedCount(parsed.stats),
    duplicates,
    errors: parsed.errors,
    skippedByType: parsed.stats,
    rows,
    freshRows,
    byCategory: Object.fromEntries(categoryCounts),
  };
}

export function serializeImportPreview(prepared: PreparedImport) {
  return {
    ok: true,
    preview: true,
    source: prepared.source,
    fileName: prepared.fileName,
    totalRows: prepared.totalRows,
    importable: prepared.freshRows.length,
    duplicates: prepared.duplicates,
    skipped: prepared.errors.length,
    skippedByType: prepared.skippedByType,
    byCategory: prepared.byCategory,
    errors: prepared.errors.slice(0, 50),
    rows: prepared.rows.slice(0, PREVIEW_ROW_LIMIT).map(({ row, category, status }) => ({
      externalId: row.externalId,
      date: row.date.toISOString().slice(0, 10),
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      category: category.name,
      status,
    })),
    rowsShown: Math.min(prepared.rows.length, PREVIEW_ROW_LIMIT),
    rowsAvailable: prepared.rows.length,
  };
}

export async function commitImport(input: {
  userId: string;
  accountId: string;
  baseCurrency: string;
  prepared: PreparedImport;
}) {
  const { prepared } = input;
  if (prepared.freshRows.length === 0) {
    return {
      ok: true,
      preview: false,
      batchId: null,
      source: prepared.source,
      inserted: 0,
      duplicates: prepared.duplicates,
      skipped: prepared.errors.length,
      skippedByType: prepared.skippedByType,
      byCategory: prepared.byCategory,
      errors: prepared.errors.slice(0, 50),
    };
  }

  const rates = await getRatesToEur();
  const baseCurrency = normalizeSupportedCurrency(input.baseCurrency);
  if (!baseCurrency) throw new Error("Unsupported primary currency");
  const multiplier = (currency: string): number => {
    if (currency === baseCurrency) return 1;
    const from = normalizeExchangeRate(
      rates[currency] ?? FALLBACK_RATES_TO_EUR[currency]
    );
    const to = normalizeExchangeRate(
      rates[baseCurrency] ?? FALLBACK_RATES_TO_EUR[baseCurrency]
    );
    const rate =
      from !== null && to !== null
        ? normalizeExchangeRate(from / to)
        : null;
    if (rate === null) throw new Error("Exchange rate unavailable");
    return rate;
  };

  const batch = await db.$transaction(
    async (tx) => {
      const createdBatch = await tx.importBatch.create({
        data: {
          userId: input.userId,
          accountId: input.accountId,
          fileName: prepared.fileName,
          source: prepared.source,
          totalRows: prepared.totalRows,
          importedRows: prepared.freshRows.length,
          duplicateRows: prepared.duplicates,
          skippedRows:
            prepared.errors.length + skippedCount(prepared.skippedByType),
        },
      });

      const createdCategories = new Map<string, string>();
      for (const item of prepared.freshRows) {
        const name = item.category.missingName;
        if (!name) continue;
        const key = name.toLowerCase();
        if (createdCategories.has(key)) continue;
        const existing = await tx.category.findFirst({
          where: { userId: input.userId, name },
          select: { id: true },
        });
        if (existing) {
          createdCategories.set(key, existing.id);
          continue;
        }
        const category = await tx.category.create({
          data: {
            userId: input.userId,
            name,
            type: item.row.type,
            color: "#94a3b8",
            icon: "📥",
          },
          select: { id: true },
        });
        createdCategories.set(key, category.id);
      }

      await tx.transaction.createMany({
        data: prepared.freshRows.map((item) => {
          const rate = multiplier(item.row.currency);
          const categoryId =
            item.category.id ??
            (item.category.missingName
              ? createdCategories.get(item.category.missingName.toLowerCase()) ?? null
              : null);
          const amountBase = calculateBaseAmount(item.row.amount, rate);
          if (amountBase === null) {
            throw new Error("Converted amount exceeds the supported range");
          }
          return {
            userId: input.userId,
            accountId: input.accountId,
            importBatchId: createdBatch.id,
            categoryId,
            type: item.row.type,
            amount: item.row.amount,
            currency: item.row.currency,
            amountBase,
            exchangeRate: rate,
            date: item.row.date,
            description: item.row.description,
            notes: item.row.notes,
            externalId: item.row.externalId,
          };
        }),
      });

      return createdBatch;
    },
    { timeout: 30_000 }
  );

  return {
    ok: true,
    preview: false,
    batchId: batch.id,
    source: prepared.source,
    inserted: prepared.freshRows.length,
    duplicates: prepared.duplicates,
    skipped: prepared.errors.length,
    skippedByType: prepared.skippedByType,
    byCategory: prepared.byCategory,
    errors: prepared.errors.slice(0, 50),
  };
}
