import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { getSelectedAccount } from "@/lib/selected-account";

function csvEscape(value: string): string {
  if (/[",\n\r;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const transactions = await db.transaction.findMany({
    where: { userId, accountId: account.id },
    include: { category: true, tagLinks: { include: { tag: true } } },
    orderBy: [{ date: "asc" }],
  });

  const header = "date,type,category,amount,currency,base_amount,description,notes,tags";
  const lines = transactions.map((t) => {
    const cells = [
      t.date.toISOString().slice(0, 10),
      t.type,
      t.category?.name ?? "",
      Number(t.amount).toFixed(2),
      t.currency,
      Number(t.amountBase).toFixed(2),
      t.description ?? "",
      (t.notes ?? "").replace(/\r?\n/g, " "),
      t.tagLinks.map(({ tag }) => tag.name).join("|"),
    ];
    return cells.map(csvEscape).join(",");
  });

  const csv = [header, ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${account.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "account"}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
