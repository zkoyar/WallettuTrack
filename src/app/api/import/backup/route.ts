import { Prisma } from "@/generated/prisma/client";
import { backupDate, findDuplicate, restoreRequestSchema } from "@/lib/backup";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { syncUserBalance } from "@/lib/account-balance";
import bcrypt from "bcryptjs";
import { readJsonBody } from "@/lib/request-body";
import {
  getReauthRateLimitKeys,
  REAUTH_RATE_LIMIT_POLICY,
  reauthRateLimitResponse,
} from "@/lib/reauth-rate-limit";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit-store";
import { calculateBaseAmount } from "@/lib/financial-constraints";

const MAX_BACKUP_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readJsonBody(request, MAX_BACKUP_BYTES);
  if (!body.ok && body.reason === "too_large") {
    return jsonError("The backup exceeds the 15 MB limit", 413);
  }
  if (!body.ok) return jsonError("Invalid JSON backup file", 422);

  const parsed = restoreRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid backup", 422);
  }

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!currentUser) return jsonError("User not found", 404);
  if (parsed.data.confirmEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
    return jsonError("Incorrect confirmation email", 422);
  }

  const rateLimitKeys = getReauthRateLimitKeys(request, userId);
  const rateLimit = await consumeRateLimit(
    REAUTH_RATE_LIMIT_POLICY,
    rateLimitKeys
  );
  if (rateLimit.blocked) return reauthRateLimitResponse(rateLimit.retryAfter);

  const passwordMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    currentUser.passwordHash
  );
  if (!passwordMatches) return jsonError("Incorrect current password", 403);
  await resetRateLimit(REAUTH_RATE_LIMIT_POLICY, rateLimitKeys);

  const backup = parsed.data.backup;
  const duplicateCategory = findDuplicate(backup.categories.map((item) => item.name));
  const duplicateAccount = findDuplicate(backup.accounts.map((item) => item.name));
  const duplicateTag = findDuplicate(backup.tags.map((item) => item.name));
  const duplicateImportBatch = findDuplicate(
    backup.importBatches.map((item) => item.id)
  );
  if (duplicateCategory) {
    return jsonError(`Duplicate category in backup: ${duplicateCategory}`, 422);
  }
  if (duplicateAccount) {
    return jsonError(`Duplicate account in backup: ${duplicateAccount}`, 422);
  }
  if (duplicateTag) {
    return jsonError(`Duplicate tag in backup: ${duplicateTag}`, 422);
  }
  if (duplicateImportBatch) {
    return jsonError(
      `Duplicate import batch in backup: ${duplicateImportBatch}`,
      422
    );
  }

  const categorySources = new Set(backup.categories.map((item) => item.id));
  const accountSources = new Set(backup.accounts.map((item) => item.id));
  const recurrenceSources = new Set(backup.recurrenceRules.map((item) => item.id));
  const importBatchSources = new Set(
    backup.importBatches.map((item) => item.id)
  );
  const missingRequiredCategory = backup.budgets.find(
    (item) => !categorySources.has(item.categoryId)
  );
  if (missingRequiredCategory) {
    return jsonError("A budget references a missing category", 422);
  }

  try {
    const counts = await db.$transaction(
      async (tx) => {
        await tx.notificationRead.deleteMany({ where: { userId } });
        await tx.alertPreference.deleteMany({ where: { userId } });
        await tx.accountReconciliation.deleteMany({ where: { userId } });
        await tx.transaction.deleteMany({ where: { userId } });
        await tx.importBatch.deleteMany({ where: { userId } });
        await tx.plannedEvent.deleteMany({ where: { userId } });
        await tx.budget.deleteMany({ where: { userId } });
        await tx.categoryRule.deleteMany({ where: { userId } });
        await tx.recurrenceRule.deleteMany({ where: { userId } });
        await tx.goal.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });
        await tx.tag.deleteMany({ where: { userId } });
        await tx.category.deleteMany({ where: { userId } });

        await tx.user.update({
          where: { id: userId },
          data: {
            name: backup.user.name ?? null,
            baseCurrency: backup.user.baseCurrency,
            locale: backup.user.locale,
            currentBalance: backup.user.currentBalance,
            onboardingCompletedAt:
              backupDate(backup.user.onboardingCompletedAt) ?? new Date(),
          },
        });

        const categoryMap = new Map<string, string>();
        const categoryNameMap = new Map<string, string>();
        for (const category of backup.categories) {
          const created = await tx.category.create({
            data: {
              userId,
              name: category.name,
              color: category.color,
              icon: category.icon,
              type: category.type,
            },
          });
          categoryMap.set(category.id, created.id);
          categoryNameMap.set(category.name.toLowerCase(), created.id);
        }

        const accountMap = new Map<string, string>();
        for (const account of backup.accounts) {
          const created = await tx.account.create({
            data: {
              userId,
              name: account.name,
              icon: account.icon,
              color: account.color,
              currentBalance: account.currentBalance,
              sortOrder: account.sortOrder,
            },
          });
          accountMap.set(account.id, created.id);
        }

        if (backup.accounts.length === 0) {
          await tx.account.create({
            data: {
              userId,
              name: "Main account",
              icon: "🏦",
              currentBalance: backup.user.currentBalance,
            },
          });
        }

        const fallbackAccountId =
          accountMap.values().next().value ??
          (
            await tx.account.findFirstOrThrow({
              where: { userId },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: { id: true },
            })
          ).id;
        const restoreAccountId = (sourceAccountId?: string | null) =>
          sourceAccountId && accountSources.has(sourceAccountId)
            ? accountMap.get(sourceAccountId) ?? fallbackAccountId
            : fallbackAccountId;

        const importBatchMap = new Map<string, string>();
        for (const batch of backup.importBatches) {
          const created = await tx.importBatch.create({
            data: {
              userId,
              accountId: restoreAccountId(batch.accountId),
              fileName: batch.fileName,
              source: batch.source,
              totalRows: batch.totalRows,
              importedRows: batch.importedRows,
              duplicateRows: batch.duplicateRows,
              skippedRows: batch.skippedRows,
              createdAt: backupDate(batch.createdAt)!,
              undoneAt: backupDate(batch.undoneAt),
            },
          });
          importBatchMap.set(batch.id, created.id);
        }

        const tagMap = new Map<string, string>();
        for (const tag of backup.tags) {
          const created = await tx.tag.create({
            data: { userId, name: tag.name, color: tag.color },
          });
          tagMap.set(tag.id, created.id);
        }

        await syncUserBalance(userId, tx);

        const recurrenceMap = new Map<string, string>();
        for (const rule of backup.recurrenceRules) {
          const created = await tx.recurrenceRule.create({
            data: {
              userId,
              accountId: restoreAccountId(rule.accountId),
              categoryId: rule.categoryId ? categoryMap.get(rule.categoryId) ?? null : null,
              type: rule.type,
              amount: rule.amount,
              currency: rule.currency,
              description: rule.description ?? null,
              notes: rule.notes ?? null,
              frequency: rule.frequency,
              interval: rule.interval,
              daysOfWeek: rule.daysOfWeek ?? null,
              dayOfMonth: rule.dayOfMonth ?? null,
              monthOfYear: rule.monthOfYear ?? null,
              startDate: backupDate(rule.startDate)!,
              endDate: backupDate(rule.endDate),
              lastGeneratedDate: backupDate(rule.lastGeneratedDate),
              active: rule.active,
            },
          });
          recurrenceMap.set(rule.id, created.id);
        }

        for (const event of backup.plannedEvents) {
          await tx.plannedEvent.create({
            data: {
              userId,
              accountId: restoreAccountId(event.accountId),
              categoryId: event.categoryId ? categoryMap.get(event.categoryId) ?? null : null,
              type: event.type,
              amount: event.amount,
              currency: event.currency,
              description: event.description ?? null,
              notes: event.notes ?? null,
              date: backupDate(event.date)!,
            },
          });
        }

        for (const budget of backup.budgets) {
          await tx.budget.create({
            data: {
              userId,
              accountId: restoreAccountId(budget.accountId),
              categoryId: categoryMap.get(budget.categoryId)!,
              amount: budget.amount,
              period: budget.period,
              alertThreshold: budget.alertThreshold,
              currency: budget.currency,
            },
          });
        }

        for (const goal of backup.goals) {
          await tx.goal.create({
            data: {
              userId,
              accountId: restoreAccountId(goal.accountId),
              name: goal.name,
              icon: goal.icon,
              targetAmount: goal.targetAmount,
              savedAmount: goal.savedAmount,
              currency: goal.currency,
              deadline: backupDate(goal.deadline),
            },
          });
        }

        for (const rule of backup.categoryRules) {
          const categoryId =
            (rule.categoryId ? categoryMap.get(rule.categoryId) : null) ??
            (rule.categoryName
              ? categoryNameMap.get(rule.categoryName.toLowerCase())
              : null);
          if (!categoryId) continue;
          await tx.categoryRule.create({
            data: { userId, categoryId, keyword: rule.keyword.toLowerCase() },
          });
        }

        for (const transaction of backup.transactions) {
          const exchangeRate =
            transaction.exchangeRate ??
            (transaction.currency === backup.user.baseCurrency ? 1 : null);
          const amountBase =
            exchangeRate === null
              ? null
              : calculateBaseAmount(transaction.amount, exchangeRate);
          // The schema performs the same consistency check before any deletes;
          // this guard also prevents a future schema change from bypassing it.
          if (amountBase === null || amountBase !== transaction.amountBase) {
            throw new RangeError("Invalid converted transaction amount");
          }
          const created = await tx.transaction.create({
            data: {
              userId,
              categoryId: transaction.categoryId
                ? categoryMap.get(transaction.categoryId) ?? null
                : null,
              recurrenceRuleId:
                transaction.recurrenceRuleId &&
                recurrenceSources.has(transaction.recurrenceRuleId)
                  ? recurrenceMap.get(transaction.recurrenceRuleId) ?? null
                  : null,
              accountId: restoreAccountId(transaction.accountId),
              importBatchId:
                transaction.importBatchId &&
                importBatchSources.has(transaction.importBatchId)
                  ? importBatchMap.get(transaction.importBatchId) ?? null
                  : null,
              type: transaction.type,
              amount: transaction.amount,
              currency: transaction.currency,
              amountBase,
              exchangeRate,
              date: backupDate(transaction.date)!,
              description: transaction.description ?? null,
              notes: transaction.notes ?? null,
              externalId: transaction.externalId ?? null,
              transferGroupId: transaction.transferGroupId ?? null,
            },
          });
          const restoredTagIds = [
            ...new Set(
              transaction.tagIds
                .map((sourceTagId) => tagMap.get(sourceTagId))
                .filter((tagId): tagId is string => Boolean(tagId))
            ),
          ];
          if (restoredTagIds.length > 0) {
            await tx.transactionTag.createMany({
              data: restoredTagIds.map((tagId) => ({
                transactionId: created.id,
                tagId,
              })),
            });
          }
        }

        for (const reconciliation of backup.reconciliations) {
          await tx.accountReconciliation.create({
            data: {
              userId,
              accountId: restoreAccountId(reconciliation.accountId),
              balanceBefore: reconciliation.balanceBefore,
              actualBalance: reconciliation.actualBalance,
              difference: reconciliation.difference,
              notes: reconciliation.notes ?? null,
              reconciledAt: backupDate(reconciliation.reconciledAt)!,
            },
          });
        }

        for (const preference of backup.alertPreferences) {
          const accountId = restoreAccountId(preference.accountId);
          const preferenceData = {
            budgetAlerts: preference.budgetAlerts,
            upcomingAlerts: preference.upcomingAlerts,
            upcomingDays: preference.upcomingDays,
            goalAlerts: preference.goalAlerts,
            lowBalanceEnabled: preference.lowBalanceEnabled,
            lowBalanceThreshold: preference.lowBalanceThreshold,
            unusualExpenseEnabled: preference.unusualExpenseEnabled,
            unusualExpenseThreshold: preference.unusualExpenseThreshold,
            subscriptionAlerts: preference.subscriptionAlerts,
          };
          await tx.alertPreference.upsert({
            where: { accountId },
            create: { userId, accountId, ...preferenceData },
            update: preferenceData,
          });
        }

        return {
          accounts: backup.accounts.length,
          categories: backup.categories.length,
          transactions: backup.transactions.length,
          recurrenceRules: backup.recurrenceRules.length,
          plannedEvents: backup.plannedEvents.length,
          budgets: backup.budgets.length,
          goals: backup.goals.length,
          categoryRules: backup.categoryRules.length,
          tags: backup.tags.length,
          reconciliations: backup.reconciliations.length,
          alertPreferences: backup.alertPreferences.length,
          importBatches: backup.importBatches.length,
        };
      },
      { timeout: 60_000 }
    );

    return Response.json({ ok: true, counts });
  } catch (error) {
    console.error("Backup restore failed", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("The backup contains duplicate data", 409);
    }
    return jsonError("Restore failed; no data was changed", 422);
  }
}
