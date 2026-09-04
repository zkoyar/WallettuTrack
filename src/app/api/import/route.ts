import { Prisma } from "@/generated/prisma/client";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import {
  commitImport,
  prepareImport,
  serializeImportPreview,
} from "@/lib/import-service";
import { DEFAULT_REVOLUT_OPTIONS } from "@/lib/importers/revolut";
import { db } from "@/lib/db";
import { getSelectedAccount } from "@/lib/selected-account";
import {
  CSV_MULTIPART_BODY_LIMIT_BYTES,
  readBodyBytes,
} from "@/lib/request-body";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) return jsonError("User not found", 404);

  const body = await readBodyBytes(request, CSV_MULTIPART_BODY_LIMIT_BYTES);
  if (!body.ok) {
    return body.reason === "too_large"
      ? jsonError("Request too large", 413)
      : jsonError("Invalid request format");
  }

  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: body.bytes,
    }).formData();
  } catch {
    return jsonError("Invalid request format");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("No file uploaded");
  if (file.size > MAX_FILE_BYTES) {
    return jsonError("File too large (maximum 5 MB)", 422);
  }

  const mode = form.get("mode") === "preview" ? "preview" : "commit";
  const options = {
    ignoreTopup:
      form.get("ignoreTopup") === null
        ? DEFAULT_REVOLUT_OPTIONS.ignoreTopup
        : form.get("ignoreTopup") !== "0",
    ignoreExchange:
      form.get("ignoreExchange") === null
        ? DEFAULT_REVOLUT_OPTIONS.ignoreExchange
        : form.get("ignoreExchange") !== "0",
    ignoreInternal:
      form.get("ignoreInternal") === null
        ? DEFAULT_REVOLUT_OPTIONS.ignoreInternal
        : form.get("ignoreInternal") !== "0",
    ignoreRevPoints:
      form.get("ignoreRevPoints") === null
        ? DEFAULT_REVOLUT_OPTIONS.ignoreRevPoints
        : form.get("ignoreRevPoints") !== "0",
  };

  const prepared = await prepareImport({
    userId,
    accountId: account.id,
    fileName: file.name,
    text: await file.text(),
    options,
  });
  if (prepared.totalRows === 0) {
    return jsonError("The CSV contains no valid rows", 422);
  }

  if (mode === "preview") {
    return Response.json(serializeImportPreview(prepared));
  }

  try {
    return Response.json(
      await commitImport({
        userId,
        accountId: account.id,
        baseCurrency: user.baseCurrency,
        prepared,
      })
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(
        "Some rows were imported in the meantime; refresh the preview",
        409
      );
    }
    console.error("CSV import failed", error);
    return jsonError("Import failed", 422);
  }
}
