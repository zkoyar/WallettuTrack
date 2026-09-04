export type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: "invalid" | "too_large" };

export type BodyBytesReadResult =
  | { ok: true; bytes: Uint8Array<ArrayBuffer> }
  | { ok: false; reason: "invalid" | "too_large" };

export const API_JSON_BODY_LIMIT_BYTES = 64 * 1024;
export const CSV_MULTIPART_BODY_LIMIT_BYTES = 6 * 1024 * 1024;

export type ApiJsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

/** Reads a request body without ever retaining more than maxBytes in memory. */
export async function readBodyText(
  request: Request,
  maxBytes: number
): Promise<BodyReadResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        // Cancellation of one branch of a cloned Request can wait for the
        // untouched branch forever, so initiate it without blocking the 413.
        void reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    void reader.cancel().catch(() => undefined);
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes: number
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid" | "too_large" }
> {
  const body = await readBodyText(request, maxBytes);
  if (!body.ok) return body;
  try {
    return { ok: true, value: JSON.parse(body.text) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Applies the standard API JSON limit and maps read failures to HTTP errors. */
export async function readApiJsonBody(
  request: Request,
  maxBytes = API_JSON_BODY_LIMIT_BYTES
): Promise<ApiJsonBodyResult> {
  const body = await readJsonBody(request, maxBytes);
  if (body.ok) return body;
  if (body.reason === "too_large") {
    return {
      ok: false,
      response: Response.json(
        { error: "Request too large" },
        { status: 413 }
      ),
    };
  }
  return {
    ok: false,
    response: Response.json({ error: "Invalid request body" }, { status: 400 }),
  };
}

/** Reads a binary body while retaining at most maxBytes plus chunk metadata. */
export async function readBodyBytes(
  request: Request,
  maxBytes: number
): Promise<BodyBytesReadResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: true, bytes: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        void reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(new ArrayBuffer(bytesRead));
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, bytes };
  } catch {
    void reader.cancel().catch(() => undefined);
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}
