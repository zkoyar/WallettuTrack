import { requireUserId, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { addDaysIso, formatDisplayDate, todayString } from "@/lib/dates";
import { z } from "zod";
import { readApiJsonBody } from "@/lib/request-body";
import { getSelectedAccount } from "@/lib/selected-account";
import { serializeAlertPreference } from "@/lib/alert-preferences";
import { getDetectedSubscriptions } from "@/lib/subscriptions";
import { formatMoney } from "@/lib/currencies";
import { getIntlLocale } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n-server";

export interface NotificationItem {
  id: string;
  kind: "budget" | "event" | "goal" | "account" | "transaction" | "subscription";
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
  href: string;
  read?: boolean;
}

const markReadSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(191)).min(1).max(100),
});

/**
 * Notifications derived from current data state without persisting the alert:
 * - monthly budgets above their threshold
 * - planned events within the configured window
 * - goals with an approaching or overdue deadline
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const [{ locale, t }, user] = await Promise.all([
    getServerI18n(),
    db.user.findUnique({ where: { id: userId }, select: { baseCurrency: true } }),
  ]);
  const intlLocale = getIntlLocale(locale);
  const baseCurrency = user?.baseCurrency ?? "EUR";

  const today = todayString();
  const storedPreferences = await db.alertPreference.findUnique({
    where: { accountId: account.id },
  });
  const preferences = serializeAlertPreference(storedPreferences);
  const inUpcoming = addDaysIso(today, preferences.upcomingDays);
  const monthStart = today.slice(0, 8) + "01";
  const items: NotificationItem[] = [];

  const [budgets, events, goals, unusualTransactions, subscriptions] = await Promise.all([
    preferences.budgetAlerts ? db.budget.findMany({
      where: { userId, accountId: account.id, period: "MONTHLY" },
      include: { category: true },
    }) : Promise.resolve([]),
    preferences.upcomingAlerts ? db.plannedEvent.findMany({
      where: {
        userId,
        accountId: account.id,
        date: {
          gte: new Date(today + "T00:00:00Z"),
          lte: new Date(inUpcoming + "T23:59:59Z"),
        },
      },
      include: { category: true },
      orderBy: { date: "asc" },
    }) : Promise.resolve([]),
    preferences.goalAlerts ? db.goal.findMany({
      where: { userId, accountId: account.id, deadline: { not: null } },
    }) : Promise.resolve([]),
    preferences.unusualExpenseEnabled
      ? db.transaction.findMany({
          where: {
            userId,
            accountId: account.id,
            type: "EXPENSE",
            transferGroupId: null,
            amountBase: { gte: preferences.unusualExpenseThreshold },
            date: { gte: new Date(addDaysIso(today, -30) + "T00:00:00Z") },
          },
          include: { category: true },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 5,
        })
      : Promise.resolve([]),
    preferences.subscriptionAlerts
      ? getDetectedSubscriptions(userId, account.id)
      : Promise.resolve([]),
  ]);

  if (
    preferences.lowBalanceEnabled &&
    account.currentBalance <= preferences.lowBalanceThreshold
  ) {
    items.push({
      id: `account:${account.id}:low-balance:${preferences.lowBalanceThreshold}`,
      kind: "account",
      severity: account.currentBalance < 0 ? "danger" : "warning",
      title: `${account.icon} ${t("Low balance in {account}", { account: account.name })}`,
      detail: t("{balance} is below the {threshold} threshold", {
        balance: formatMoney(account.currentBalance, baseCurrency, intlLocale),
        threshold: formatMoney(preferences.lowBalanceThreshold, baseCurrency, intlLocale),
      }),
      href: "/reconciliation",
    });
  }

  // Budgets.
  if (budgets.length > 0) {
    const spentRows = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        accountId: account.id,
        type: "EXPENSE",
        transferGroupId: null,
        categoryId: { in: budgets.map((b) => b.categoryId) },
        date: { gte: new Date(monthStart + "T00:00:00Z") },
      },
      _sum: { amountBase: true },
    });
    const spentMap = new Map(
      spentRows.map((r) => [r.categoryId!, Number(r._sum.amountBase ?? 0)])
    );
    for (const b of budgets) {
      const limit = Number(b.amount);
      const spent = spentMap.get(b.categoryId) ?? 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      if (pct >= b.alertThreshold) {
        items.push({
          id: `account:${account.id}:budget:${b.id}:${monthStart}:${pct >= 100 ? "danger" : "warning"}`,
          kind: "budget",
          severity: pct >= 100 ? "danger" : "warning",
          title: `${b.category.icon} ${t("{category}: budget at {percent}%", {
            category: t(b.category.name),
            percent: Math.round(pct),
          })}`,
          detail: t("{spent} of {limit} this month", {
            spent: formatMoney(spent, baseCurrency, intlLocale),
            limit: formatMoney(limit, baseCurrency, intlLocale),
          }),
          href: "/budgets",
        });
      }
    }
  }

  // Upcoming events.
  for (const e of events) {
    const iso = e.date.toISOString().slice(0, 10);
    const isToday = iso <= today;
    const description = t(e.description || "Planned event");
    items.push({
      id: `event:${e.id}`,
      kind: "event",
      severity: isToday ? "danger" : "info",
      title: `${e.category?.icon ?? "📌"} ${
        isToday
          ? t("{description} is today", { description })
          : t("{description} on {date}", {
              description,
              date: formatDisplayDate(iso, intlLocale),
            })
      }`,
      detail: `${e.type === "INCOME" ? "+" : "−"}${formatMoney(
        Number(e.amount),
        e.currency,
        intlLocale
      )}`,
      href: "/calendar",
    });
  }

  // Goals.
  for (const g of goals) {
    if (!g.deadline) continue;
    const dl = g.deadline.toISOString().slice(0, 10);
    const remaining = Number(g.targetAmount) - Number(g.savedAmount);
    if (remaining <= 0) continue;
    if (dl <= inUpcoming) {
      const overdue = dl < today;
      items.push({
        id: `goal:${g.id}:${overdue ? "overdue" : "due"}`,
        kind: "goal",
        severity: overdue ? "danger" : "info",
        title: `🎯 ${
          overdue
            ? t("{name}: overdue ({date})", {
                name: g.name,
                date: formatDisplayDate(dl, intlLocale),
              })
            : t("{name}: due soon ({date})", {
                name: g.name,
                date: formatDisplayDate(dl, intlLocale),
              })
        }`,
        detail: t("{amount} remaining", {
          amount: formatMoney(remaining, g.currency, intlLocale),
        }),
        href: "/budgets",
      });
    }
  }

  for (const transaction of unusualTransactions) {
    items.push({
      id: `transaction:${transaction.id}:high-expense:${preferences.unusualExpenseThreshold}`,
      kind: "transaction",
      severity: "warning",
      title: `${transaction.category?.icon ?? "💳"} ${t("High expense")}`,
      detail: `${formatMoney(
        Number(transaction.amountBase),
        baseCurrency,
        intlLocale
      )} · ${
        transaction.description || t(transaction.category?.name || "Movement")
      }`,
      href: "/transactions",
    });
  }

  for (const subscription of subscriptions) {
    if (subscription.priceChangePercent === null) continue;
    items.push({
      id: `subscription:${account.id}:${subscription.id}:increase:${subscription.latestAmount}`,
      kind: "subscription",
      severity: "warning",
      title: `📈 ${t("{description} price increase", {
        description: subscription.description,
      })}`,
      detail: t("New amount {amount} (+{percent}%)", {
        amount: formatMoney(
          subscription.latestAmount,
          subscription.currency,
          intlLocale
        ),
        percent: subscription.priceChangePercent,
      }),
      href: "/recurrences",
    });
  }

  const order = { danger: 0, warning: 1, info: 2 } as const;
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  const readRows =
    items.length === 0
      ? []
      : await db.notificationRead.findMany({
          where: { userId, fingerprint: { in: items.map((item) => item.id) } },
          select: { fingerprint: true },
        });
  const readIds = new Set(readRows.map((row) => row.fingerprint));
  const withReadState = items.map((item) => ({
    ...item,
    read: readIds.has(item.id),
  }));

  return Response.json({
    items: withReadState,
    unreadCount: withReadState.filter((item) => !item.read).length,
  });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = markReadSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const ids = [...new Set(parsed.data.ids)];
  await db.notificationRead.createMany({
    data: ids.map((fingerprint) => ({ userId, fingerprint })),
    skipDuplicates: true,
  });

  return Response.json({ ok: true, marked: ids.length });
}
