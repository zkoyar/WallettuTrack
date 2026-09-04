/** DTO mappers convert Prisma models containing Decimal/Date values to clean JSON. */

interface TxPrismaLike {
  id: string;
  type: string;
  amount: unknown;
  currency: string;
  amountBase: unknown;
  exchangeRate?: unknown;
  date: Date;
  description: string | null;
  notes: string | null;
  recurrenceRuleId: string | null;
  externalId?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
  } | null;
  account?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
  tagLinks?: Array<{
    tag: { id: string; name: string; color: string };
  }>;
}

function pickRef(obj?: { id: string; name: string; color: string; icon: string } | null) {
  return obj ? { id: obj.id, name: obj.name, color: obj.color, icon: obj.icon } : null;
}

/** Transaction → client DTO with ISO dates and primitive numbers. */
export function serializeTransaction<
  T extends TxPrismaLike & { createdAt?: unknown; updatedAt?: unknown },
>(t: T) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    amountBase: Number(t.amountBase),
    exchangeRate: t.exchangeRate != null ? Number(t.exchangeRate) : null,
    date: t.date.toISOString().slice(0, 10),
    description: t.description,
    notes: t.notes,
    recurrenceRuleId: t.recurrenceRuleId,
    externalId: t.externalId ?? null,
    accountId: t.accountId ?? null,
    categoryId: t.categoryId ?? null,
    category: pickRef(t.category as never),
    account: pickRef(t.account as never),
    tags: (t.tagLinks ?? []).map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
  };
}

interface EventPrismaLike {
  id: string;
  type: string;
  amount: unknown;
  currency: string;
  description: string | null;
  notes: string | null;
  date: Date;
  category?: { id: string; name: string; color: string; icon: string; type: string } | null;
}

export function serializeEvent(e: EventPrismaLike) {
  return {
    id: e.id,
    type: e.type,
    amount: Number(e.amount),
    currency: e.currency,
    description: e.description,
    notes: e.notes,
    date: e.date.toISOString().slice(0, 10),
    category: e.category
      ? {
          ...pickRef(e.category),
          type: e.category.type,
        }
      : null,
  };
}

interface GoalPrismaLike {
  id: string;
  name: string;
  icon: string;
  targetAmount: unknown;
  savedAmount: unknown;
  currency: string;
  deadline: Date | null;
}

export function serializeGoal(g: GoalPrismaLike) {
  return {
    id: g.id,
    name: g.name,
    icon: g.icon,
    targetAmount: Number(g.targetAmount),
    savedAmount: Number(g.savedAmount),
    currency: g.currency,
    deadline: g.deadline ? g.deadline.toISOString().slice(0, 10) : null,
  };
}

interface AccountPrismaLike {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentBalance: unknown;
  sortOrder: number;
}

export function serializeAccount(a: AccountPrismaLike) {
  return { ...a, currentBalance: Number(a.currentBalance) };
}
