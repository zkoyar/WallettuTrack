import { describe, expect, it } from "vitest";
import {
  bcryptPasswordSchema,
  isPasswordWithinBcryptLimit,
} from "./password-policy";

describe("password policy", () => {
  it("accepts inputs up to bcrypt's 72-byte boundary", () => {
    expect(isPasswordWithinBcryptLimit("a".repeat(72))).toBe(true);
    expect(bcryptPasswordSchema.safeParse("a".repeat(72)).success).toBe(true);
  });

  it("rejects silently truncated ASCII and Unicode passwords", () => {
    expect(isPasswordWithinBcryptLimit("a".repeat(73))).toBe(false);
    expect(isPasswordWithinBcryptLimit("é".repeat(37))).toBe(false);
    expect(bcryptPasswordSchema.safeParse("é".repeat(37)).success).toBe(false);
  });
});
