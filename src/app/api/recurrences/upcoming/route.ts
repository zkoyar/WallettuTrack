import { requireUserId, jsonError } from "@/lib/api-helpers";
import { getUpcomingOccurrences } from "@/lib/upcoming";
import { getSelectedAccount } from "@/lib/selected-account";

/**
 * GET /api/recurrences/upcoming?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Alternatively, ?days=N covers tomorrow through N days from now.
 * Returns projected future occurrences from recurrence rules.
 */
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selectedAccount = await getSelectedAccount(userId);
  if (!selectedAccount) return jsonError("No account available", 409);

  const url = new URL(req.url);
  let from = url.searchParams.get("from");
  let to = url.searchParams.get("to");

  if (!from || !to) {
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? "30")));
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const horizon = new Date(tomorrow);
    horizon.setUTCDate(horizon.getUTCDate() + days - 1);
    from = tomorrow.toISOString().slice(0, 10);
    to = horizon.toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return jsonError("Invalid date parameters (YYYY-MM-DD)");
  }

  const items = await getUpcomingOccurrences(
    userId,
    from,
    to,
    selectedAccount.id
  );
  return Response.json({ items });
}
