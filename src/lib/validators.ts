import { z } from "zod";
import {
  isSupportedCurrency,
  MAX_DESCRIPTION_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_MONEY_AMOUNT,
  MAX_NOTES_LENGTH,
  roundMoney,
} from "@/lib/financial-constraints";
import {
  bcryptPasswordSchema,
  MIN_PASSWORD_CHARACTERS,
} from "@/lib/password-policy";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Invalid email address").max(MAX_EMAIL_LENGTH),
  password: bcryptPasswordSchema.min(
    MIN_PASSWORD_CHARACTERS,
    "Password must be at least 12 characters"
  ),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address").max(MAX_EMAIL_LENGTH),
  password: bcryptPasswordSchema.min(1, "Password is required"),
});

export const categoryTypeSchema = z.enum(["EXPENSE", "INCOME"]);
export const frequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export const budgetPeriodSchema = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);

export const moneyAmountSchema = z.coerce
  .number()
  .finite()
  .min(-MAX_MONEY_AMOUNT)
  .max(MAX_MONEY_AMOUNT)
  .transform(roundMoney);

export const positiveMoneyAmountSchema = z.coerce
  .number()
  .finite()
  .positive("Amount must be positive")
  .max(MAX_MONEY_AMOUNT)
  .refine((value) => roundMoney(value) > 0, "Amount must be at least 0.01")
  .transform(roundMoney);

export const nonNegativeMoneyAmountSchema = z.coerce
  .number()
  .finite()
  .min(0)
  .max(MAX_MONEY_AMOUNT)
  .transform(roundMoney);

const accountFields = {
  name: z.string().trim().min(1, "Name is required").max(40),
  icon: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  currentBalance: moneyAmountSchema,
};

export const accountSchema = z.object({
  name: accountFields.name,
  icon: accountFields.icon.default("🏦"),
  color: accountFields.color.default("#6366f1"),
  currentBalance: accountFields.currentBalance.default(0),
});

export const accountUpdateSchema = z.object(accountFields).partial();

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((v) => v.toUpperCase())
  .refine(isSupportedCurrency, "Unsupported currency");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (expected YYYY-MM-DD)");

const categoryFields = {
  name: z.string().trim().min(1, "Name is required").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  icon: z.string().trim().min(1).max(8),
  type: categoryTypeSchema,
};

export const categorySchema = z.object({
  name: categoryFields.name,
  color: categoryFields.color.default("#6366f1"),
  icon: categoryFields.icon.default("📦"),
  type: categoryFields.type.default("EXPENSE"),
});

export const categoryUpdateSchema = z.object(categoryFields).partial();

const transactionFields = {
  type: categoryTypeSchema,
  categoryId: z.string().cuid().nullable().optional(),
  accountId: z.string().cuid().nullable().optional(),
  amount: positiveMoneyAmountSchema,
  currency: currencyCodeSchema,
  date: isoDate,
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional().or(z.literal("")),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional().or(z.literal("")),
  tagIds: z.array(z.string().cuid()).max(20).optional(),
};

export const transactionSchema = z.object({
  ...transactionFields,
  type: transactionFields.type.default("EXPENSE"),
});

export const transactionUpdateSchema = z.object(transactionFields).partial();

const recurrenceFields = {
  type: categoryTypeSchema,
  categoryId: z.string().cuid().nullable().optional(),
  amount: positiveMoneyAmountSchema,
  currency: currencyCodeSchema,
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional().or(z.literal("")),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional().or(z.literal("")),
  frequency: frequencySchema,
  interval: z.coerce.number().int().min(1).max(365),
  daysOfWeek: z
    .string()
    .regex(/^([0-6](,[0-6])*)?$/, "Invalid days of the week")
    .nullish(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).nullish(),
  monthOfYear: z.coerce.number().int().min(1).max(12).nullish(),
  startDate: isoDate,
  endDate: isoDate.nullish(),
  active: z.boolean(),
};

export const recurrenceBaseSchema = z.object({
  ...recurrenceFields,
  type: recurrenceFields.type.default("EXPENSE"),
  interval: recurrenceFields.interval.default(1),
  active: recurrenceFields.active.default(true),
});

export const recurrenceSchema = recurrenceBaseSchema.refine(
  (r) =>
    r.frequency !== "WEEKLY" ||
    (r.daysOfWeek && r.daysOfWeek.length > 0) ||
    r.startDate,
  { message: "Select at least one day of the week", path: ["daysOfWeek"] }
);

export const recurrenceUpdateSchema = z.object(recurrenceFields).partial();

const budgetFields = {
  categoryId: z.string().cuid("Category is required"),
  amount: positiveMoneyAmountSchema,
  period: budgetPeriodSchema,
  alertThreshold: z.coerce.number().int().min(1).max(100),
};

export const budgetSchema = z.object({
  ...budgetFields,
  period: budgetFields.period.default("MONTHLY"),
  alertThreshold: budgetFields.alertThreshold.default(80),
});

export const budgetUpdateSchema = z.object(budgetFields).partial();

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  baseCurrency: currencyCodeSchema.optional(),
  currentBalance: moneyAmountSchema.optional(),
});
