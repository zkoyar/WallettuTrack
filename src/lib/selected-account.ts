import { cookies } from "next/headers";
import { pickSelectedAccount } from "@/lib/account-selection";
import { db } from "@/lib/db";
import { serializeAccount } from "@/lib/serializers";

export const SELECTED_ACCOUNT_COOKIE = "wallettutrack-selected-account";

export type AccountContext = ReturnType<typeof serializeAccount>;

export async function getUserAccounts(userId: string): Promise<AccountContext[]> {
  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return accounts.map(serializeAccount);
}

export async function getSelectedAccount(
  userId: string,
  availableAccounts?: AccountContext[]
): Promise<AccountContext | null> {
  const [accounts, cookieStore] = await Promise.all([
    availableAccounts ?? getUserAccounts(userId),
    cookies(),
  ]);
  return pickSelectedAccount(
    accounts,
    cookieStore.get(SELECTED_ACCOUNT_COOKIE)?.value
  );
}

/**
 * Assigns legacy or unlinked data to the active account after an account is
 * deleted. New writes are already linked to an account.
 */
export async function assignUnlinkedData(
  userId: string,
  accountId: string
): Promise<void> {
  await db.$transaction([
    db.transaction.updateMany({
      where: { userId, accountId: null },
      data: { accountId },
    }),
    db.recurrenceRule.updateMany({
      where: { userId, accountId: null },
      data: { accountId },
    }),
    db.plannedEvent.updateMany({
      where: { userId, accountId: null },
      data: { accountId },
    }),
    db.budget.updateMany({
      where: { userId, accountId: null },
      data: { accountId },
    }),
    db.goal.updateMany({
      where: { userId, accountId: null },
      data: { accountId },
    }),
  ]);
}
