import { jsonError, requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { getSelectedAccount } from "@/lib/selected-account";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const { id } = await context.params;
  const batch = await db.importBatch.findFirst({
    where: { id, userId, accountId: account.id },
    select: { id: true, undoneAt: true },
  });
  if (!batch) return jsonError("Import not found", 404);
  if (batch.undoneAt) return jsonError("Import has already been undone", 409);

  let deleted: { count: number };
  try {
    deleted = await db.$transaction(async (tx) => {
      const claimed = await tx.importBatch.updateMany({
        where: { id, userId, accountId: account.id, undoneAt: null },
        data: { undoneAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("IMPORT_ALREADY_UNDONE");
      return tx.transaction.deleteMany({ where: { userId, importBatchId: id } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "IMPORT_ALREADY_UNDONE") {
      return jsonError("Import has already been undone", 409);
    }
    throw error;
  }

  return Response.json({ ok: true, deleted: deleted.count });
}
