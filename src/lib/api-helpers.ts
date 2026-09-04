import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Returns an authenticated user ID only while the JWT version is current. */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionVersion = session?.user?.sessionVersion;
  if (!userId || !Number.isSafeInteger(sessionVersion)) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return user?.sessionVersion === sessionVersion ? userId : null;
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
