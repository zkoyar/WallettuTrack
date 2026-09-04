import { requireUserId, jsonError } from "@/lib/api-helpers";
import { getCashflowForecast } from "@/lib/cashflow";
import { getSelectedAccount } from "@/lib/selected-account";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selectedAccount = await getSelectedAccount(userId);
  if (!selectedAccount) return jsonError("No account available", 409);

  const url = new URL(req.url);
  const days = Math.min(180, Math.max(7, Number(url.searchParams.get("days") ?? "90")));

  const result = await getCashflowForecast(userId, days, selectedAccount.id);
  if (!result) return jsonError("User not found", 404);

  return Response.json({
    ...result,
    account: {
      id: selectedAccount.id,
      name: selectedAccount.name,
      icon: selectedAccount.icon,
    },
  });
}
