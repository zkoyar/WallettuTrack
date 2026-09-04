import { TransfersClient } from "@/components/transfers/transfers-client";
import { getSelectedAccount, getUserAccounts } from "@/lib/selected-account";
import { requireUser } from "@/lib/session";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Transfers")} · WallettuTrack` };
}

export default async function TransfersPage() {
  const user = await requireUser();
  const accounts = await getUserAccounts(user.id);
  const selected = await getSelectedAccount(user.id, accounts);
  if (!selected) return null;

  return (
    <TransfersClient
      accounts={accounts.map(({ id, name, icon }) => ({ id, name, icon }))}
      selectedAccountId={selected.id}
      baseCurrency={user.baseCurrency}
    />
  );
}
