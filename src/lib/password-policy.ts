import bcrypt from "bcryptjs";
import { z } from "zod";

export const MIN_PASSWORD_CHARACTERS = 12;
export const MAX_PASSWORD_CHARACTERS = 128;

/**
 * bcrypt silently ignores bytes after its 72-byte input limit. Reject those
 * values so two different passwords can never authenticate as the same one.
 */
export function isPasswordWithinBcryptLimit(password: string): boolean {
  return !bcrypt.truncates(password);
}

export const bcryptPasswordSchema = z
  .string()
  .max(MAX_PASSWORD_CHARACTERS)
  .refine(isPasswordWithinBcryptLimit, "Password is too long when encoded");
