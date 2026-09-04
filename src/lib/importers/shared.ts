import crypto from "node:crypto";

/** Deterministic fingerprint for an imported transaction, used for deduplication. */
export function fingerprint(parts: (string | number | null | undefined)[]): string {
  return crypto
    .createHash("sha256")
    .update(parts.map((p) => String(p ?? "")).join("|"))
    .digest("hex")
    .slice(0, 32);
}

export interface ImportedRow {
  externalId: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  currency: string;
  date: Date;
  description: string | null;
  notes: string | null;
  categoryName: string | null;
}

/**
 * Filters rows already stored in the database and duplicates within the file.
 * Returns new rows and the number of discarded duplicates.
 */
export async function filterDuplicates(
  userId: string,
  rows: ImportedRow[],
  // Looks up existing transactions by externalId.
  findExistingIds: (ids: string[]) => Promise<Set<string>>
): Promise<{ fresh: ImportedRow[]; duplicates: number }> {
  const ids = [...new Set(rows.map((r) => r.externalId))];
  const existing = await findExistingIds(ids);

  const seen = new Set<string>();
  const fresh: ImportedRow[] = [];
  let duplicates = 0;

  for (const row of rows) {
    if (existing.has(row.externalId) || seen.has(row.externalId)) {
      duplicates++;
      continue;
    }
    seen.add(row.externalId);
    fresh.push(row);
  }

  return { fresh, duplicates };
}
