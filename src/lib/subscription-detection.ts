export interface SubscriptionInput {
  id: string;
  date: Date;
  description: string | null;
  amount: number;
  currency: string;
  category: { id: string; name: string; icon: string; color: string } | null;
}

export interface SubscriptionCandidate {
  id: string;
  description: string;
  normalizedDescription: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  occurrences: number;
  averageAmount: number;
  latestAmount: number;
  previousAverage: number | null;
  priceChangePercent: number | null;
  currency: string;
  lastDate: string;
  nextDate: string;
  category: SubscriptionInput["category"];
}

const DAY_MS = 86_400_000;

export function normalizeSubscriptionDescription(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(pagamento|addebito|carta|pos|sepa|direct debit|paypal)\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function classifyInterval(days: number): {
  frequency: SubscriptionCandidate["frequency"];
  interval: number;
} | null {
  if (days >= 5 && days <= 9) return { frequency: "WEEKLY", interval: 1 };
  if (days >= 330 && days <= 400) return { frequency: "YEARLY", interval: 1 };

  const months = Math.round(days / 30.4375);
  if (months >= 1 && months <= 12) {
    const tolerance = Math.max(7, months * 4);
    if (Math.abs(days - months * 30.4375) <= tolerance) {
      return { frequency: "MONTHLY", interval: months };
    }
  }
  return null;
}

function addPeriod(
  iso: string,
  frequency: SubscriptionCandidate["frequency"],
  interval: number
): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (frequency === "WEEKLY") {
    date.setUTCDate(date.getUTCDate() + 7 * interval);
  } else if (frequency === "MONTHLY") {
    const day = date.getUTCDate();
    const targetMonth = date.getUTCMonth() + interval;
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0)
    ).getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(targetMonth);
    date.setUTCDate(Math.min(day, lastDay));
  } else {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCFullYear(date.getUTCFullYear() + interval);
    date.setUTCMonth(month);
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), month + 1, 0)
    ).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  return date.toISOString().slice(0, 10);
}

export function detectSubscriptionCandidates(
  transactions: SubscriptionInput[],
  today = new Date()
): SubscriptionCandidate[] {
  const groups = new Map<string, SubscriptionInput[]>();
  for (const transaction of transactions) {
    if (!transaction.description) continue;
    const normalized = normalizeSubscriptionDescription(transaction.description);
    if (normalized.length < 3) continue;
    const key = `${normalized}::${transaction.currency}`;
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  const todayIso = today.toISOString().slice(0, 10);
  const candidates: SubscriptionCandidate[] = [];

  for (const [key, group] of groups) {
    group.sort((a, b) => a.date.getTime() - b.date.getTime());
    if (group.length < 2) continue;
    const intervals = group
      .slice(1)
      .map((item, index) =>
        Math.round((item.date.getTime() - group[index].date.getTime()) / DAY_MS)
      )
      .filter((days) => days > 0);
    if (intervals.length === 0) continue;

    const cadence = classifyInterval(median(intervals));
    if (!cadence) continue;
    if (cadence.frequency !== "YEARLY" && group.length < 3) continue;

    const expectedDays =
      cadence.frequency === "WEEKLY"
        ? 7 * cadence.interval
        : cadence.frequency === "YEARLY"
          ? 365 * cadence.interval
          : 30.4375 * cadence.interval;
    const cadenceTolerance = Math.max(4, expectedDays * 0.22);
    if (intervals.some((days) => Math.abs(days - expectedDays) > cadenceTolerance)) {
      continue;
    }

    const amounts = group.map((item) => item.amount);
    const average = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
    if (average <= 0) continue;
    const maxDeviation = Math.max(...amounts.map((value) => Math.abs(value - average)));
    if (maxDeviation / average > 0.35) continue;

    const latest = group[group.length - 1];
    const previousAmounts = amounts.slice(0, -1);
    const previousAverage =
      previousAmounts.length > 0
        ? previousAmounts.reduce((sum, value) => sum + value, 0) /
          previousAmounts.length
        : null;
    const priceChangePercent =
      previousAverage &&
      latest.amount - previousAverage >= 0.5 &&
      latest.amount > previousAverage * 1.03
        ? Math.round(((latest.amount / previousAverage - 1) * 100) * 10) / 10
        : null;

    const lastDate = latest.date.toISOString().slice(0, 10);
    let nextDate = addPeriod(lastDate, cadence.frequency, cadence.interval);
    while (nextDate <= todayIso) {
      nextDate = addPeriod(nextDate, cadence.frequency, cadence.interval);
    }

    const normalizedDescription = key.slice(0, key.lastIndexOf("::"));
    candidates.push({
      id: key,
      description: latest.description!.trim(),
      normalizedDescription,
      frequency: cadence.frequency,
      interval: cadence.interval,
      occurrences: group.length,
      averageAmount: Math.round(average * 100) / 100,
      latestAmount: latest.amount,
      previousAverage:
        previousAverage === null ? null : Math.round(previousAverage * 100) / 100,
      priceChangePercent,
      currency: latest.currency,
      lastDate,
      nextDate,
      category: latest.category,
    });
  }

  return candidates.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}
