import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api-helpers";
import { formatMoney, formatMoneyCompact } from "@/lib/currencies";
import { formatDayMonth } from "@/lib/dates";
import { getUpcomingOccurrences } from "@/lib/upcoming";
import { PrintButton } from "@/components/report/print-button";
import { getSelectedAccount } from "@/lib/selected-account";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";
import { getIntlLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Monthly report")} · WallettuTrack` };
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function computeNow(locale: string) {
  const d = new Date();
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    todayIso: d.toISOString().slice(0, 10),
    tomorrowIso: new Date(d.getTime() + 86400000).toISOString().slice(0, 10),
    horizon31: new Date(d.getTime() + 31 * 86400000).toISOString().slice(0, 10),
    localeDate: d.toLocaleDateString(locale),
  };
}

export default async function ReportPage({ searchParams }: PageProps) {
  const { locale, t: tr } = await getServerI18n();
  const intlLocale = getIntlLocale(locale);
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const account = await getSelectedAccount(userId);
  if (!account) redirect("/settings");
  const accountId = account.id;

  const sp = await searchParams;
  const nowParts = computeNow(intlLocale);
  let year = nowParts.y;
  let month = nowParts.m; // 0-based
  if (typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m)) {
    const [yy, mm] = sp.m.split("-").map(Number);
    if (mm >= 1 && mm <= 12) {
      year = yy;
      month = mm - 1;
    }
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, baseCurrency: true },
  });
  const currency = user.baseCurrency;

  const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endStr = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  // Previous month.
  const prevStart = new Date(Date.UTC(year, month - 1, 1));
  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  const [txs, prevTxs, budgets, upcoming] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        accountId,
        transferGroupId: null,
        date: {
          gte: new Date(startStr + "T00:00:00Z"),
          lte: new Date(endStr + "T23:59:59Z"),
        },
      },
      include: { category: true },
      orderBy: [{ date: "asc" }],
    }),
    db.transaction.findMany({
      where: {
        userId,
        accountId,
        transferGroupId: null,
        date: {
          gte: new Date(prevStartStr + "T00:00:00Z"),
          lte: new Date(prevEndStr + "T23:59:59Z"),
        },
      },
      select: { type: true, amountBase: true, categoryId: true },
    }),
    db.budget.findMany({
      where: { userId, accountId, period: "MONTHLY" },
      include: { category: true },
    }),
    getUpcomingOccurrences(
      userId,
      nowParts.todayIso > endStr ? nowParts.todayIso : nowParts.tomorrowIso,
      nowParts.horizon31,
      accountId
    ),
  ]);

  let exp = 0;
  let inc = 0;
  const byCat = new Map<
    string,
    { name: string; icon: string; total: number; count: number }
  >();
  for (const t of txs) {
    const amt = Number(t.amountBase);
    if (t.type === "EXPENSE") exp += amt;
    else inc += amt;
    if (t.type !== "EXPENSE") continue;
    const key = t.categoryId ?? "_none";
    const entry =
      byCat.get(key) ??
      byCat
        .set(key, {
          name: t.category ? tr(t.category.name) : tr("Uncategorized"),
          icon: t.category?.icon ?? "📦",
          total: 0,
          count: 0,
        })
        .get(key)!;
    entry.total += amt;
    entry.count++;
  }
  const catRows = [...byCat.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total);

  // Change from the previous month by category.
  const prevByCat = new Map<string, number>();
  let prevExp = 0;
  let prevInc = 0;
  for (const t of prevTxs) {
    const amt = Number(t.amountBase);
    if (t.type === "EXPENSE") {
      prevExp += amt;
      if (t.categoryId) {
        prevByCat.set(t.categoryId, (prevByCat.get(t.categoryId) ?? 0) + amt);
      }
    } else prevInc += amt;
  }

  // Monthly budgets: spending in the selected month by category.
  const budgetRows = budgets.map((b) => {
    const spent = txs
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          t.categoryId === b.categoryId
      )
      .reduce((s, t) => s + Number(t.amountBase), 0);
    return {
      name: `${b.category.icon} ${tr(b.category.name)}`,
      limit: Number(b.amount),
      spent,
      pct: Number(b.amount) > 0 ? Math.round((spent / Number(b.amount)) * 100) : 0,
    };
  });

  const projExpenses = upcoming
    .filter((u) => u.type === "EXPENSE")
    .reduce((s, u) => s + u.amountBase, 0);

  const monthLabel = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
  const expDeltaPct =
    prevExp > 0 ? Math.round(((exp - prevExp) / prevExp) * 100) : null;

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-black print:p-2 dark:bg-white dark:text-black">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {tr("Expense report · {month}", { month: monthLabel })}
          </h1>
          <p className="text-sm text-gray-500">
            {tr("{user} · {account} · generated on {date} · values in {currency}", {
              user: user.name ?? "",
              account: `${account.icon} ${account.name}`,
              date: nowParts.localeDate,
              currency,
            })}
          </p>
        </div>
        <div className="grid gap-2 text-right">
          <a
            href={`/report?m=${month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`}`}
            className="no-print rounded-md border px-2.5 py-1.5 text-xs hover:bg-gray-50"
          >
            {tr("← Previous month")}
          </a>
          <a
            href={`/report?m=${month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, "0")}`}`}
            className="no-print rounded-md border px-2.5 py-1.5 text-xs hover:bg-gray-50"
          >
            {tr("Next month →")}
          </a>
        </div>
        <PrintButton />
      </div>

      {/* KPI */}
      <table className="w-full border-collapse text-sm" cellPadding={0}>
        <tbody>
          <tr className="border-y">
            <td className="py-3 pr-4 font-medium">{tr("Expenses")}</td>
            <td className="py-3 pr-6 text-right font-semibold tabular-nums">
              {formatMoney(exp, currency, intlLocale)}
            </td>
            <td className="py-3 pl-4 font-medium">{tr("Income")}</td>
            <td className="py-3 text-right font-semibold tabular-nums">
              {formatMoney(inc, currency, intlLocale)}
            </td>
            <td className="py-3 pl-4 font-medium">{tr("Net balance")}</td>
            <td
              className={`py-3 text-right font-semibold tabular-nums ${
                inc - exp >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatMoney(inc - exp, currency, intlLocale)}
            </td>
          </tr>
          <tr>
            <td colSpan={6} className="pt-1 text-xs text-gray-500">
              {tr("Previous month: expenses {expenses} · income {income}", {
                expenses: formatMoneyCompact(prevExp, currency, intlLocale),
                income: formatMoneyCompact(prevInc, currency, intlLocale),
              })}
              {expDeltaPct !== null && (
                <>
                  {" "}
                  <strong className={expDeltaPct > 0 ? "text-red-600" : "text-emerald-700"}>
                    {tr(" · expense change {percent}%", {
                      percent: `${expDeltaPct > 0 ? "+" : ""}${expDeltaPct}`,
                    })}
                  </strong>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Categories. */}
      <h2 className="mt-6 border-b pb-1 text-base font-semibold">
        {tr("Expenses by category ({count})", { count: catRows.length })}
      </h2>
      <table className="mt-2 w-full text-sm" cellPadding={0}>
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-1.5">{tr("Category")}</th>
            <th className="py-1.5 text-right">{tr("Transactions")}</th>
            <th className="py-1.5 text-right">{tr("Previous month")}</th>
            <th className="py-1.5 text-right">{tr("Total")}</th>
            <th className="py-1.5 text-right">{tr("Share")}</th>
          </tr>
        </thead>
        <tbody>
          {catRows.map((c) => {
            const prev = prevByCat.get(c.id) ?? 0;
            const share = exp > 0 ? Math.round((c.total / exp) * 100) : 0;
            return (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-1.5">
                  {c.icon} {c.name}
                </td>
                <td className="py-1.5 text-right tabular-nums">{c.count}</td>
                <td className="py-1.5 text-right tabular-nums text-gray-500">
                  {prev > 0 ? formatMoneyCompact(prev, currency, intlLocale) : "—"}
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatMoney(c.total, currency, intlLocale)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-gray-500">
                  {share}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Budgets. */}
      {budgetRows.length > 0 && (
        <>
          <h2 className="mt-6 border-b pb-1 text-base font-semibold">
            {tr("Monthly budgets")}
          </h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {budgetRows.map((b) => (
              <li key={b.name} className="flex items-center justify-between border-b py-1.5 last:border-0">
                <span>{b.name}</span>
                <span className="tabular-nums">
                  {formatMoney(b.spent, currency, intlLocale)} / {formatMoney(b.limit, currency, intlLocale)}
                  <span
                    className={`ml-2 inline-block w-12 text-right font-medium ${
                      b.pct >= 100
                        ? "text-red-600"
                        : b.pct >= 80
                          ? "text-orange-500"
                          : "text-emerald-700"
                    }`}
                  >
                    {b.pct}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Forecast for the next 30 days. */}
      {upcoming.length > 0 && (
        <>
          <h2 className="mt-6 border-b pb-1 text-base font-semibold">
            {tr("Next 30 days (forecast)")}
          </h2>
          <p className="mt-1 text-sm">
            {tr("{count} planned movements · forecast expenses {expenses} · income {income}", {
              count: upcoming.length,
              expenses: formatMoney(
                upcoming.filter((u) => u.type === "EXPENSE").reduce((s, u) => s + u.amountBase, 0),
                currency,
                intlLocale
              ),
              income: formatMoney(
                upcoming.filter((u) => u.type === "INCOME").reduce((s, u) => s + u.amountBase, 0),
                currency,
                intlLocale
              ),
            })}
          </p>
          <ul className="mt-1 grid gap-0.5 text-xs text-gray-600">
            {upcoming.slice(0, 10).map((u) => (
              <li key={`${u.source}-${u.id}-${u.date}`} className="flex justify-between">
                <span>
                  {formatDayMonth(u.date, intlLocale)} ·{" "}
                  {u.description || (u.category ? tr(u.category.name) : null) || tr("Movement")}
                  <span className="text-gray-400">
                    {" "}
                    ({tr(u.source === "event" ? "event" : "recurring")})
                  </span>
                </span>
                <span className="tabular-nums">
                  {u.type === "INCOME" ? "+" : "−"}
                  {formatMoneyCompact(u.amountBase, currency, intlLocale)}
                </span>
              </li>
            ))}
            {upcoming.length > 10 && (
              <li className="italic">{tr("…and {count} more", { count: upcoming.length - 10 })}</li>
            )}
          </ul>
          <p className="mt-1 text-[11px] text-gray-400">
            {tr("Note: forecasts include planned movements only; ordinary future spending is not included.")}
          </p>
        </>
      )}

      <footer className="mt-8 border-t pt-2 text-[11px] text-gray-400">
        {projExpenses > 0
          ? tr("Generated with WallettuTrack · forecast included: {amount}", {
              amount: formatMoneyCompact(projExpenses, currency, intlLocale),
            })
          : tr("Generated with WallettuTrack · no forecast in this period")}
      </footer>
    </main>
  );
}
