import { requireUserId, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";

/**
 * GET /api/export/json — complete backup of user data.
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const [user, categories, transactions, recurrenceRules, plannedEvents, budgets, goals, accounts, categoryRules, tags, reconciliations, alertPreferences, importBatches] =
    await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          baseCurrency: true,
          locale: true,
          currentBalance: true,
          onboardingCompletedAt: true,
        },
      }),
      db.category.findMany({ where: { userId } }),
      db.transaction.findMany({
        where: { userId },
        include: { tagLinks: true },
        orderBy: { date: "asc" },
      }),
      db.recurrenceRule.findMany({ where: { userId } }),
      db.plannedEvent.findMany({ where: { userId } }),
      db.budget.findMany({ where: { userId } }),
      db.goal.findMany({ where: { userId } }),
      db.account.findMany({ where: { userId } }),
      db.categoryRule.findMany({ where: { userId }, include: { category: true } }),
      db.tag.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.accountReconciliation.findMany({
        where: { userId },
        orderBy: { reconciledAt: "asc" },
      }),
      db.alertPreference.findMany({ where: { userId } }),
      db.importBatch.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "WallettuTrack",
    user: {
      ...user,
      currentBalance: Number(user.currentBalance),
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    },
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      icon: account.icon,
      color: account.color,
      currentBalance: Number(account.currentBalance),
      sortOrder: account.sortOrder,
    })),
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      type: category.type,
    })),
    categoryRules: categoryRules.map((r) => ({
      id: r.id,
      keyword: r.keyword,
      categoryId: r.categoryId,
      categoryName: r.category.name,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      importBatchId: t.importBatchId,
      categoryId: t.categoryId,
      recurrenceRuleId: t.recurrenceRuleId,
      accountId: t.accountId,
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      amountBase: Number(t.amountBase),
      exchangeRate: t.exchangeRate == null ? null : Number(t.exchangeRate),
      description: t.description,
      notes: t.notes,
      externalId: t.externalId,
      transferGroupId: t.transferGroupId,
      tagIds: t.tagLinks.map((link) => link.tagId),
    })),
    importBatches: importBatches.map((batch) => ({
      id: batch.id,
      accountId: batch.accountId,
      fileName: batch.fileName,
      source: batch.source,
      totalRows: batch.totalRows,
      importedRows: batch.importedRows,
      duplicateRows: batch.duplicateRows,
      skippedRows: batch.skippedRows,
      createdAt: batch.createdAt.toISOString(),
      undoneAt: batch.undoneAt?.toISOString() ?? null,
    })),
    recurrenceRules: recurrenceRules.map((rule) => ({
      id: rule.id,
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      type: rule.type,
      amount: Number(rule.amount),
      currency: rule.currency,
      description: rule.description,
      notes: rule.notes,
      frequency: rule.frequency,
      interval: rule.interval,
      daysOfWeek: rule.daysOfWeek,
      dayOfMonth: rule.dayOfMonth,
      monthOfYear: rule.monthOfYear,
      startDate: rule.startDate.toISOString().slice(0, 10),
      endDate: rule.endDate?.toISOString().slice(0, 10) ?? null,
      lastGeneratedDate:
        rule.lastGeneratedDate?.toISOString().slice(0, 10) ?? null,
      active: rule.active,
    })),
    plannedEvents: plannedEvents.map((event) => ({
      id: event.id,
      accountId: event.accountId,
      categoryId: event.categoryId,
      type: event.type,
      amount: Number(event.amount),
      currency: event.currency,
      description: event.description,
      notes: event.notes,
      date: event.date.toISOString().slice(0, 10),
    })),
    budgets: budgets.map((budget) => ({
      id: budget.id,
      accountId: budget.accountId,
      categoryId: budget.categoryId,
      amount: Number(budget.amount),
      period: budget.period,
      alertThreshold: budget.alertThreshold,
      currency: budget.currency,
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      accountId: goal.accountId,
      name: goal.name,
      icon: goal.icon,
      targetAmount: Number(goal.targetAmount),
      savedAmount: Number(goal.savedAmount),
      currency: goal.currency,
      deadline: goal.deadline?.toISOString().slice(0, 10) ?? null,
    })),
    reconciliations: reconciliations.map((item) => ({
      id: item.id,
      accountId: item.accountId,
      balanceBefore: Number(item.balanceBefore),
      actualBalance: Number(item.actualBalance),
      difference: Number(item.difference),
      notes: item.notes,
      reconciledAt: item.reconciledAt.toISOString(),
    })),
    alertPreferences: alertPreferences.map((item) => ({
      accountId: item.accountId,
      budgetAlerts: item.budgetAlerts,
      upcomingAlerts: item.upcomingAlerts,
      upcomingDays: item.upcomingDays,
      goalAlerts: item.goalAlerts,
      lowBalanceEnabled: item.lowBalanceEnabled,
      lowBalanceThreshold: Number(item.lowBalanceThreshold),
      unusualExpenseEnabled: item.unusualExpenseEnabled,
      unusualExpenseThreshold: Number(item.unusualExpenseThreshold),
      subscriptionAlerts: item.subscriptionAlerts,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="wallettutrack-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
