import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api-helpers";
import { generateDueTransactions } from "@/lib/recurrence-service";
import { AppShell } from "@/components/app-shell";
import {
  assignUnlinkedData,
  getSelectedAccount,
  getUserAccounts,
} from "@/lib/selected-account";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      baseCurrency: true,
      currentBalance: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user) redirect("/login");
  if (!user.onboardingCompletedAt) redirect("/onboarding");

  // Ensure at least one account exists, using the consolidated balance initially.
  const accountCount = await db.account.count({ where: { userId } });
  if (accountCount === 0) {
    await db.account.create({
      data: {
        userId,
        name: "Main account",
        icon: "🏦",
        currentBalance: user.currentBalance,
      },
    });
  }

  const accounts = await getUserAccounts(userId);
  const selectedAccount = await getSelectedAccount(userId, accounts);
  if (!selectedAccount) redirect("/login");

  await assignUnlinkedData(userId, selectedAccount.id);

  // Materialize only after every movement is guaranteed to have an account.
  try {
    await generateDueTransactions(userId);
  } catch (e) {
    console.error("Recurrence generation error:", e);
  }

  return (
    <AppShell
      user={user}
      accounts={accounts}
      selectedAccountId={selectedAccount.id}
    >
      {children}
    </AppShell>
  );
}
