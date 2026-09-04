import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { authConfig } from "@/auth.config";
import { validateRuntimeConfiguration } from "@/lib/runtime-config";

const { auth } = NextAuth(authConfig);

function contentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${development ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function isUnsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function trustedOrigins(request: NextAuthRequest): Set<string> {
  const origins = new Set([request.nextUrl.origin]);
  try {
    origins.add(new URL(process.env.AUTH_URL ?? "").origin);
  } catch {
    // Runtime validation reports an invalid AUTH_URL separately.
  }
  return origins;
}

function rejectsCrossSiteMutation(request: NextAuthRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api/")) return false;
  if (request.nextUrl.pathname.startsWith("/api/auth/")) return false;
  if (!isUnsafeMethod(request.method)) return false;

  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  return origin !== null && !trustedOrigins(request).has(origin);
}

export default auth((request) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);

  if (rejectsCrossSiteMutation(request)) {
    return Response.json(
      { error: "Request origin is not allowed" },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "Content-Security-Policy": policy,
        },
      }
    );
  }

  const configurationIssues = validateRuntimeConfiguration();
  if (configurationIssues.length > 0) {
    console.error("Invalid runtime configuration:", configurationIssues.join(","));
    const headers = {
      "Cache-Control": "no-store",
      "Content-Security-Policy": policy,
    };
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return Response.json(
        { status: "error", configuration: "invalid" },
        { status: 503, headers }
      );
    }
    return new Response("Service temporarily unavailable.", {
      status: 503,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  if (request.auth?.user?.id) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)",
  ],
};
