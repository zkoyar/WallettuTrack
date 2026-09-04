import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  baseCurrency: string;
  currentBalance: number;
}

/**
 * Request-scoped session singleton: React cache deduplicates calls made by
 * layouts and pages during the same render pass.
 */
export const getCurrentUser = cache(
  async (): Promise<SessionUser | null> => {
    const session = await auth();
    const userId = session?.user?.id;
    const sessionVersion = session?.user?.sessionVersion;
    if (!userId || !Number.isSafeInteger(sessionVersion)) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        sessionVersion: true,
        name: true,
        email: true,
        baseCurrency: true,
        currentBalance: true,
      },
    });
    if (!user || user.sessionVersion !== sessionVersion) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      baseCurrency: user.baseCurrency,
      currentBalance: Number(user.currentBalance),
    };
  }
);

/** Requires an authenticated user on server pages, otherwise redirects to login. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
