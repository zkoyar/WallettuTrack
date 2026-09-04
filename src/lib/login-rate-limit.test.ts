import { describe, expect, it } from "vitest";
import {
  createLoginRateLimiter,
  getClientAddress,
  getLoginRateLimitContext,
  isSuccessfulCredentialsResponse,
} from "./login-rate-limit";

describe("login rate limiting", () => {
  it("blocks after the maximum number of failures", () => {
    const limiter = createLoginRateLimiter(3, 60_000);
    limiter.failure("ip|user", 1_000);
    limiter.failure("ip|user", 2_000);
    expect(limiter.check("ip|user", 3_000).blocked).toBe(false);
    limiter.failure("ip|user", 3_000);
    expect(limiter.check("ip|user", 4_000)).toEqual({
      blocked: true,
      retryAfter: 57,
    });
  });

  it("isolates IP/email pairs and resets after success", () => {
    const limiter = createLoginRateLimiter(1, 60_000);
    limiter.failure("ip-a|uno@example.it", 1_000);
    expect(limiter.check("ip-a|uno@example.it", 2_000).blocked).toBe(true);
    expect(limiter.check("ip-b|uno@example.it", 2_000).blocked).toBe(false);
    expect(limiter.check("ip-a|due@example.it", 2_000).blocked).toBe(false);
    limiter.reset("ip-a|uno@example.it");
    expect(limiter.check("ip-a|uno@example.it", 2_000).blocked).toBe(false);
  });

  it("expires at the end of the window", () => {
    const limiter = createLoginRateLimiter(1, 10_000);
    limiter.failure("ip|user", 1_000);
    expect(limiter.check("ip|user", 10_999).blocked).toBe(true);
    expect(limiter.check("ip|user", 11_000).blocked).toBe(false);
  });

  it("uses only headers rewritten by the proxy", () => {
    const withRealIp = new Request("https://wallet.example/api/auth/callback/credentials", {
      headers: {
        "x-real-ip": "203.0.113.7",
        "x-forwarded-for": "198.51.100.2, 192.0.2.9",
      },
    });
    expect(getClientAddress(withRealIp)).toBe("203.0.113.7");

    const withForwardedChain = new Request("https://wallet.example/login", {
      headers: { "x-forwarded-for": "198.51.100.2, 192.0.2.9" },
    });
    expect(getClientAddress(withForwardedChain)).toBe("192.0.2.9");
  });

  it("extracts keys from form and JSON credential callbacks", async () => {
    const formRequest = new Request(
      "https://wallet.example/api/auth/callback/credentials",
      {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.10" },
        body: new URLSearchParams({ email: "User@Example.com" }),
      }
    );
    await expect(getLoginRateLimitContext(formRequest)).resolves.toEqual({
      keys: ["ip:203.0.113.10", "email:user@example.com"],
      bodyTooLarge: false,
    });

    const jsonRequest = new Request(
      "https://wallet.example/api/auth/callback/credentials",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "203.0.113.11",
        },
        body: JSON.stringify({ email: "Json@Example.com" }),
      }
    );
    await expect(getLoginRateLimitContext(jsonRequest)).resolves.toEqual({
      keys: ["ip:203.0.113.11", "email:json@example.com"],
      bodyTooLarge: false,
    });
  });

  it("always rate limits a credential callback even with an invalid body", async () => {
    const request = new Request(
      "https://wallet.example/api/auth/callback/credentials",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "203.0.113.12",
        },
        body: "not-json",
      }
    );
    await expect(getLoginRateLimitContext(request)).resolves.toEqual({
      keys: ["ip:203.0.113.12"],
      bodyTooLarge: false,
    });
  });

  it("rejects oversized credential bodies before Auth.js parses them", async () => {
    const request = new Request(
      "https://wallet.example/api/auth/callback/credentials",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "203.0.113.13",
        },
        body: JSON.stringify({ email: "a".repeat(17_000) }),
      }
    );
    await expect(getLoginRateLimitContext(request)).resolves.toEqual({
      keys: ["ip:203.0.113.13"],
      bodyTooLarge: true,
    });
  });

  it("only treats an Auth.js session cookie as a successful sign-in", () => {
    expect(
      isSuccessfulCredentialsResponse(
        new Response(null, {
          status: 302,
          headers: { location: "/login?error=MissingCSRF" },
        })
      )
    ).toBe(false);

    expect(
      isSuccessfulCredentialsResponse(
        new Response(null, {
          status: 302,
          headers: {
            "set-cookie": "__Secure-authjs.session-token=token; Path=/; HttpOnly",
          },
        })
      )
    ).toBe(true);
  });
});
