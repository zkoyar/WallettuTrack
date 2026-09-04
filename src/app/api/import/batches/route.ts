import { jsonError, requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { getSelectedAccount } from "@/lib/selected-account";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const batches = await db.importBatch.findMany({
    where: { userId, accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { transactions: true } } },
  });

  return Response.json({
    items: batches.map((batch) => ({
      id: batch.id,
      fileName: batch.fileName,
      source: batch.source,
      totalRows: batch.totalRows,
      importedRows: batch.importedRows,
      remainingRows: batch._count.transactions,
      duplicateRows: batch.duplicateRows,
      skippedRows: batch.skippedRows,
      createdAt: batch.createdAt.toISOString(),
      undoneAt: batch.undoneAt?.toISOString() ?? null,
    })),
  });
}
