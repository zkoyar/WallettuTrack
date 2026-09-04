export function pickSelectedAccount<T extends { id: string }>(
  accounts: T[],
  requestedId: string | null | undefined
): T | null {
  if (accounts.length === 0) return null;
  return accounts.find((account) => account.id === requestedId) ?? accounts[0];
}
