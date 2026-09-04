import { describe, expect, it } from "vitest";
import {
  readApiJsonBody,
  readBodyBytes,
  readBodyText,
  readJsonBody,
} from "./request-body";

describe("bounded request body reading", () => {
  it("parses JSON inside the configured byte limit", async () => {
    const request = new Request("https://wallet.example/api/test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });
    await expect(readJsonBody(request, 64)).resolves.toEqual({
      ok: true,
      value: { ok: true },
    });
  });

  it("rejects actual bodies over the limit without a Content-Length header", async () => {
    const request = new Request("https://wallet.example/api/test", {
      method: "POST",
      body: "x".repeat(65),
    });
    await expect(readBodyText(request, 64)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects an oversized declared Content-Length before reading", async () => {
    const request = new Request("https://wallet.example/api/test", {
      method: "POST",
      headers: { "content-length": "1000" },
      body: "{}",
    });
    await expect(readJsonBody(request, 64)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("maps oversized API JSON bodies to HTTP 413", async () => {
    const request = new Request("https://wallet.example/api/test", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    const result = await readApiJsonBody(request, 32);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
    await expect(result.response.json()).resolves.toEqual({
      error: "Request too large",
    });
  });

  it("maps malformed API JSON bodies to HTTP 400", async () => {
    const request = new Request("https://wallet.example/api/test", {
      method: "POST",
      body: "{",
    });
    const result = await readApiJsonBody(request, 32);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
  });

  it("retains binary request data only when it fits the limit", async () => {
    const payload = new Uint8Array([0, 255, 1, 254]);
    const accepted = await readBodyBytes(
      new Request("https://wallet.example/api/import", {
        method: "POST",
        body: payload,
      }),
      payload.byteLength
    );
    expect(accepted).toEqual({ ok: true, bytes: payload });

    const rejected = await readBodyBytes(
      new Request("https://wallet.example/api/import", {
        method: "POST",
        body: payload,
      }),
      payload.byteLength - 1
    );
    expect(rejected).toEqual({ ok: false, reason: "too_large" });
  });
});
