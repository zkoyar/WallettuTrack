import { db } from "@/lib/db";

export type RegistrationMode = "first-user" | "open" | "closed";

export function getRegistrationMode(): RegistrationMode {
  const value = process.env.REGISTRATION_MODE?.trim().toLowerCase();
  if (value === "open" || value === "closed" || value === "first-user") {
    return value;
  }
  return "first-user";
}

export async function isRegistrationAvailable(): Promise<boolean> {
  const mode = getRegistrationMode();
  if (mode === "open") return true;
  if (mode === "closed") return false;
  return (await db.user.count()) === 0;
}
