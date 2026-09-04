import { verifyDatabaseConnection } from "@/lib/db";
import { validateRuntimeConfiguration } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

/** Docker health check for the Next.js process and MySQL connection. */
export async function GET() {
  const configurationIssues = validateRuntimeConfiguration();
  if (configurationIssues.length > 0) {
    console.error("Invalid runtime configuration:", configurationIssues.join(","));
    return Response.json(
      { status: "error", configuration: "invalid" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await verifyDatabaseConnection();
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "Unknown error";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "without code";
    console.error(`Database health check failed: ${name} (${code})`);
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
