import { jsonError, requireUserId } from "@/lib/api-helpers";
import { getSelectedAccount } from "@/lib/selected-account";
import { getDetectedSubscriptions } from "@/lib/subscriptions";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const items = await getDetectedSubscriptions(userId, account.id);
  return Response.json({ items });
}
