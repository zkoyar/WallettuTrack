import { z } from "zod";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { serializeAlertPreference } from "@/lib/alert-preferences";
import { db } from "@/lib/db";
import { getSelectedAccount } from "@/lib/selected-account";
import {
  moneyAmountSchema,
  nonNegativeMoneyAmountSchema,
} from "@/lib/validators";
import { readApiJsonBody } from "@/lib/request-body";

const preferenceSchema = z.object({
  budgetAlerts: z.boolean().optional(),
  upcomingAlerts: z.boolean().optional(),
  upcomingDays: z.coerce.number().int().min(1).max(30).optional(),
  goalAlerts: z.boolean().optional(),
  lowBalanceEnabled: z.boolean().optional(),
  lowBalanceThreshold: moneyAmountSchema.optional(),
  unusualExpenseEnabled: z.boolean().optional(),
  unusualExpenseThreshold: nonNegativeMoneyAmountSchema.optional(),
  subscriptionAlerts: z.boolean().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const stored = await db.alertPreference.findUnique({
    where: { accountId: account.id },
  });
  return Response.json({
    account: { id: account.id, name: account.name, icon: account.icon },
    item: serializeAlertPreference(stored),
  });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = preferenceSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const stored = await db.alertPreference.upsert({
    where: { accountId: account.id },
    create: { userId, accountId: account.id, ...parsed.data },
    update: parsed.data,
  });
  return Response.json({ ok: true, item: serializeAlertPreference(stored) });
}
