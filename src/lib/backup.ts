import { z } from "zod";
import {
  calculateBaseAmount,
  calculateReconciliationDifference,
  isSupportedCurrency,
  MAX_DESCRIPTION_LENGTH,
  MAX_DERIVED_MONEY_AMOUNT,
  MAX_EMAIL_LENGTH,
  MAX_EXCHANGE_RATE,
  MAX_MONEY_AMOUNT,
  MAX_NOTES_LENGTH,
  MAX_RECONCILIATION_DIFFERENCE,
  MIN_EXCHANGE_RATE,
  normalizeExchangeRate,
  normalizeMoneyAmount,
  roundMoney,
} from "@/lib/financial-constraints";
import { bcryptPasswordSchema } from "@/lib/password-policy";

const sourceId = z.string().min(1).max(191);
const optionalSourceId = sourceId.nullish();
const money = z.coerce
  .number()
  .finite()
  .min(-MAX_MONEY_AMOUNT)
  .max(MAX_MONEY_AMOUNT)
  .transform(roundMoney);
const positiveMoney = z.coerce
  .number()
  .finite()
  .positive()
  .max(MAX_MONEY_AMOUNT)
  .refine((value) => roundMoney(value) > 0)
  .transform(roundMoney);
const nonNegativeMoney = z.coerce
  .number()
  .finite()
  .min(0)
  .max(MAX_MONEY_AMOUNT)
  .transform(roundMoney);
const positiveDerivedMoney = z.coerce
  .number()
  .finite()
  .positive()
  .max(MAX_DERIVED_MONEY_AMOUNT)
  .refine((value) => roundMoney(value) > 0)
  .transform(roundMoney);
const consolidatedMoney = z.coerce
  .number()
  .finite()
  .min(-MAX_DERIVED_MONEY_AMOUNT)
  .max(MAX_DERIVED_MONEY_AMOUNT)
  .transform(roundMoney);
const currency = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())
  .refine(isSupportedCurrency, "Unsupported currency");
const isoDate = z
  .string()
  .max(30)
  .regex(
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/,
    "Invalid backup date"
  )
  .refine(isValidBackupDate, "Invalid backup date");
const categoryType = z.enum(["EXPENSE", "INCOME"]);

const categorySchema = z.object({
  id: sourceId,
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().trim().min(1).max(8),
  type: categoryType,
});

const accountSchema = z.object({
  id: sourceId,
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  currentBalance: money,
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
});

const tagSchema = z.object({
  id: sourceId,
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const recurrenceSchema = z.object({
  id: sourceId,
  accountId: optionalSourceId,
  categoryId: optionalSourceId,
  type: categoryType,
  amount: positiveMoney,
  currency,
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullish(),
  notes: z.string().max(MAX_NOTES_LENGTH).nullish(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.coerce.number().int().min(1).max(365),
  daysOfWeek: z.string().max(20).nullish(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).nullish(),
  monthOfYear: z.coerce.number().int().min(1).max(12).nullish(),
  startDate: isoDate,
  endDate: isoDate.nullish(),
  lastGeneratedDate: isoDate.nullish(),
  active: z.boolean(),
});

const transactionSchema = z.object({
  id: sourceId.optional(),
  importBatchId: optionalSourceId,
  categoryId: optionalSourceId,
  recurrenceRuleId: optionalSourceId,
  accountId: optionalSourceId,
  type: categoryType,
  amount: positiveMoney,
  currency,
  amountBase: positiveDerivedMoney,
  exchangeRate: z.coerce
    .number()
    .finite()
    .min(MIN_EXCHANGE_RATE)
    .max(MAX_EXCHANGE_RATE)
    .transform((value) => normalizeExchangeRate(value)!)
    .nullish(),
  date: isoDate,
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullish(),
  notes: z.string().max(MAX_NOTES_LENGTH).nullish(),
  externalId: z.string().max(255).nullish(),
  transferGroupId: z.string().max(191).nullish(),
  tagIds: z.array(sourceId).max(20).optional().default([]),
});

const importBatchSchema = z.object({
  id: sourceId,
  accountId: sourceId,
  fileName: z.string().trim().min(1).max(191),
  source: z.string().trim().min(1).max(40),
  totalRows: z.coerce.number().int().min(0).max(1_000_000),
  importedRows: z.coerce.number().int().min(0).max(1_000_000),
  duplicateRows: z.coerce.number().int().min(0).max(1_000_000).default(0),
  skippedRows: z.coerce.number().int().min(0).max(1_000_000).default(0),
  createdAt: isoDate,
  undoneAt: isoDate.nullish(),
});

const plannedEventSchema = z.object({
  id: sourceId,
  accountId: optionalSourceId,
  categoryId: optionalSourceId,
  type: categoryType,
  amount: positiveMoney,
  currency,
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullish(),
  notes: z.string().max(MAX_NOTES_LENGTH).nullish(),
  date: isoDate,
});

const budgetSchema = z.object({
  id: sourceId,
  accountId: optionalSourceId,
  categoryId: sourceId,
  amount: positiveMoney,
  period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  alertThreshold: z.coerce.number().int().min(1).max(100),
  currency,
});

const goalSchema = z.object({
  id: sourceId,
  accountId: optionalSourceId,
  name: z.string().trim().min(1).max(100),
  icon: z.string().trim().min(1).max(8),
  targetAmount: positiveMoney,
  savedAmount: nonNegativeMoney,
  currency,
  deadline: isoDate.nullish(),
});

const categoryRuleSchema = z.object({
  id: sourceId,
  keyword: z.string().trim().min(1).max(100),
  categoryId: sourceId.optional(),
  categoryName: z.string().trim().min(1).max(50).optional(),
});

const reconciliationSchema = z
  .object({
    id: sourceId,
    accountId: sourceId,
    balanceBefore: money,
    actualBalance: money,
    difference: z.coerce
      .number()
      .finite()
      .min(-MAX_RECONCILIATION_DIFFERENCE)
      .max(MAX_RECONCILIATION_DIFFERENCE)
      .transform(roundMoney),
    notes: z.string().max(MAX_NOTES_LENGTH).nullish(),
    reconciledAt: isoDate,
  })
  .refine(
    (item) =>
      item.difference ===
      calculateReconciliationDifference(item.actualBalance, item.balanceBefore),
    { message: "Invalid reconciliation difference", path: ["difference"] }
  );

const alertPreferenceSchema = z.object({
  accountId: sourceId,
  budgetAlerts: z.boolean(),
  upcomingAlerts: z.boolean(),
  upcomingDays: z.coerce.number().int().min(1).max(30),
  goalAlerts: z.boolean(),
  lowBalanceEnabled: z.boolean(),
  lowBalanceThreshold: money,
  unusualExpenseEnabled: z.boolean(),
  unusualExpenseThreshold: nonNegativeMoney,
  subscriptionAlerts: z.boolean(),
});

const backupObjectSchema = z.object({
  schemaVersion: z.literal(1).optional(),
  exportedAt: isoDate.optional(),
  app: z.literal("WallettuTrack"),
  user: z.object({
    email: z.email().max(MAX_EMAIL_LENGTH),
    name: z.string().max(100).nullish(),
    baseCurrency: currency,
    locale: z.string().min(2).max(20).default("en-GB"),
    currentBalance: consolidatedMoney,
    onboardingCompletedAt: isoDate.nullish(),
  }),
  accounts: z.array(accountSchema).max(1_000),
  tags: z.array(tagSchema).max(10_000).optional().default([]),
  categories: z.array(categorySchema).max(2_000),
  categoryRules: z.array(categoryRuleSchema).max(10_000),
  transactions: z.array(transactionSchema).max(200_000),
  importBatches: z.array(importBatchSchema).max(10_000).optional().default([]),
  recurrenceRules: z.array(recurrenceSchema).max(10_000),
  plannedEvents: z.array(plannedEventSchema).max(50_000),
  budgets: z.array(budgetSchema).max(10_000),
  goals: z.array(goalSchema).max(10_000),
  reconciliations: z
    .array(reconciliationSchema)
    .max(100_000)
    .optional()
    .default([]),
  alertPreferences: z
    .array(alertPreferenceSchema)
    .max(1_000)
    .optional()
    .default([]),
});

export const backupSchema = backupObjectSchema.superRefine((backup, ctx) => {
  const duplicateCollections: Array<
    [string, Array<{ id: string }>, string]
  > = [
    ["accounts", backup.accounts, "account"],
    ["categories", backup.categories, "category"],
    ["tags", backup.tags, "tag"],
    ["categoryRules", backup.categoryRules, "category rule"],
    ["importBatches", backup.importBatches, "import batch"],
    ["recurrenceRules", backup.recurrenceRules, "recurrence rule"],
    ["plannedEvents", backup.plannedEvents, "planned event"],
    ["budgets", backup.budgets, "budget"],
    ["goals", backup.goals, "goal"],
    ["reconciliations", backup.reconciliations, "reconciliation"],
  ];
  for (const [path, items, label] of duplicateCollections) {
    const duplicate = findDuplicate(items.map(({ id }) => id));
    if (duplicate) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate ${label} identifier`,
        path: [path],
      });
    }
  }

  const accountIds = new Set(backup.accounts.map(({ id }) => id));
  const categoryIds = new Set(backup.categories.map(({ id }) => id));
  const tagIds = new Set(backup.tags.map(({ id }) => id));
  const recurrenceIds = new Set(backup.recurrenceRules.map(({ id }) => id));
  const importBatchIds = new Set(backup.importBatches.map(({ id }) => id));

  const requireReference = (
    value: string | null | undefined,
    validIds: Set<string>,
    path: Array<string | number>,
    label: string
  ) => {
    if (value && !validIds.has(value)) {
      ctx.addIssue({
        code: "custom",
        message: `Missing ${label} reference`,
        path,
      });
    }
  };

  let consolidatedBalance = 0;
  for (const [index, account] of backup.accounts.entries()) {
    const nextTotal = normalizeMoneyAmount(
      consolidatedBalance + account.currentBalance,
      MAX_DERIVED_MONEY_AMOUNT
    );
    if (nextTotal === null) {
      ctx.addIssue({
        code: "custom",
        message: "The consolidated account balance exceeds the supported range",
        path: ["accounts", index, "currentBalance"],
      });
      break;
    }
    consolidatedBalance = nextTotal;
  }
  if (
    backup.accounts.length === 0 &&
    normalizeMoneyAmount(backup.user.currentBalance) === null
  ) {
    ctx.addIssue({
      code: "custom",
      message: "The fallback account balance exceeds the supported range",
      path: ["user", "currentBalance"],
    });
  }

  backup.importBatches.forEach((item, index) =>
    requireReference(
      item.accountId,
      accountIds,
      ["importBatches", index, "accountId"],
      "account"
    )
  );
  backup.recurrenceRules.forEach((item, index) => {
    requireReference(
      item.accountId,
      accountIds,
      ["recurrenceRules", index, "accountId"],
      "account"
    );
    requireReference(
      item.categoryId,
      categoryIds,
      ["recurrenceRules", index, "categoryId"],
      "category"
    );
  });
  backup.plannedEvents.forEach((item, index) => {
    requireReference(
      item.accountId,
      accountIds,
      ["plannedEvents", index, "accountId"],
      "account"
    );
    requireReference(
      item.categoryId,
      categoryIds,
      ["plannedEvents", index, "categoryId"],
      "category"
    );
  });
  backup.budgets.forEach((item, index) => {
    requireReference(
      item.accountId,
      accountIds,
      ["budgets", index, "accountId"],
      "account"
    );
    requireReference(
      item.categoryId,
      categoryIds,
      ["budgets", index, "categoryId"],
      "category"
    );
  });
  backup.goals.forEach((item, index) =>
    requireReference(
      item.accountId,
      accountIds,
      ["goals", index, "accountId"],
      "account"
    )
  );
  backup.reconciliations.forEach((item, index) =>
    requireReference(
      item.accountId,
      accountIds,
      ["reconciliations", index, "accountId"],
      "account"
    )
  );
  backup.alertPreferences.forEach((item, index) =>
    requireReference(
      item.accountId,
      accountIds,
      ["alertPreferences", index, "accountId"],
      "account"
    )
  );
  backup.categoryRules.forEach((item, index) => {
    if (item.categoryId && !categoryIds.has(item.categoryId)) {
      const fallbackExists =
        item.categoryName &&
        backup.categories.some(
          ({ name }) => name.toLowerCase() === item.categoryName!.toLowerCase()
        );
      if (!fallbackExists) {
        ctx.addIssue({
          code: "custom",
          message: "Missing category reference",
          path: ["categoryRules", index, "categoryId"],
        });
      }
    }
  });

  backup.transactions.forEach((item, index) => {
    requireReference(
      item.accountId,
      accountIds,
      ["transactions", index, "accountId"],
      "account"
    );
    requireReference(
      item.categoryId,
      categoryIds,
      ["transactions", index, "categoryId"],
      "category"
    );
    requireReference(
      item.recurrenceRuleId,
      recurrenceIds,
      ["transactions", index, "recurrenceRuleId"],
      "recurrence rule"
    );
    requireReference(
      item.importBatchId,
      importBatchIds,
      ["transactions", index, "importBatchId"],
      "import batch"
    );
    item.tagIds.forEach((tagId, tagIndex) =>
      requireReference(
        tagId,
        tagIds,
        ["transactions", index, "tagIds", tagIndex],
        "tag"
      )
    );

    const rate =
      item.exchangeRate ??
      (item.currency === backup.user.baseCurrency ? 1 : null);
    const calculated = rate === null ? null : calculateBaseAmount(item.amount, rate);
    if (calculated === null || calculated !== item.amountBase) {
      ctx.addIssue({
        code: "custom",
        message: "The converted amount is inconsistent with its amount and rate",
        path: ["transactions", index, "amountBase"],
      });
    }
  });
});

export const restoreRequestSchema = z.object({
  mode: z.literal("replace"),
  confirmEmail: z.email().max(MAX_EMAIL_LENGTH),
  currentPassword: bcryptPasswordSchema.min(1),
  backup: backupSchema,
});

export type BackupPayload = z.infer<typeof backupSchema>;

export function backupDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.length === 10 ? `${value}T00:00:00Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidBackupDate(value: string): boolean {
  const date = backupDate(value);
  if (!date) return false;
  return date.toISOString().slice(0, 10) === value.slice(0, 10);
}

export function findDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (seen.has(normalized)) return value;
    seen.add(normalized);
  }
  return null;
}
