import { getRatesToEur } from "@/lib/rates";
import { requireUserId, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const rates = await getRatesToEur();
  return Response.json({ rates, fetchedAt: new Date().toISOString() });
}
