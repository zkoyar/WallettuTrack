import { afterEach, describe, expect, it } from "vitest";
import {
  getPrivacyConfiguration,
  getSourceCodeUrl,
  validateRuntimeConfiguration,
} from "./runtime-config";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
});

function validPublicEnvironment() {
  Object.assign(process.env, {
    DEPLOYMENT_VISIBILITY: "public",
    AUTH_URL: "https://wallet.example",
    AUTH_SECRET: "0123456789abcdef0123456789abcdef",
    DATABASE_URL:
      "mysql://wallet:0123456789abcdef0123456789abcdef@mysql:3306/wallet",
    REGISTRATION_MODE: "first-user",
    PRIVACY_CONTROLLER_NAME: "Mario Rossi",
    PRIVACY_CONTACT_EMAIL: "privacy@example.com",
    SOURCE_CODE_URL: "https://code.example/wallettutrack",
  });
}

describe("runtime configuration", () => {
  it("accepts a complete public configuration", () => {
    validPublicEnvironment();
    expect(validateRuntimeConfiguration()).toEqual([]);
    expect(getSourceCodeUrl()).toBe("https://code.example/wallettutrack");
  });

  it("rejects placeholder secrets and incomplete public configuration", () => {
    validPublicEnvironment();
    process.env.AUTH_SECRET = "generate-a-long-random-string";
    process.env.DATABASE_URL =
      "mysql://wallet:generate-at-least-48-random-characters@mysql:3306/wallet";
    process.env.SOURCE_CODE_URL = "javascript:alert(1)";

    expect(validateRuntimeConfiguration()).toEqual(
      expect.arrayContaining([
        "AUTH_SECRET_WEAK",
        "DATABASE_PASSWORD_TOO_SHORT",
        "SOURCE_CODE_URL_INVALID",
      ])
    );
    expect(getSourceCodeUrl()).toBeUndefined();
  });

  it("requires explicit confirmation for open public registration", () => {
    validPublicEnvironment();
    process.env.REGISTRATION_MODE = "open";
    process.env.ALLOW_PUBLIC_REGISTRATION = "false";
    expect(validateRuntimeConfiguration()).toContain(
      "PUBLIC_REGISTRATION_NOT_ACKNOWLEDGED"
    );
  });

  it("keeps safe privacy defaults for private installations", () => {
    Object.assign(process.env, {
      DEPLOYMENT_VISIBILITY: "private",
      AUTH_URL: "http://localhost:3001",
      AUTH_SECRET: "0123456789abcdef0123456789abcdef",
      DATABASE_URL:
        "mysql://wallet:0123456789abcdef0123456789abcdef@localhost:3306/wallet",
    });
    expect(getPrivacyConfiguration()).toMatchObject({
      visibility: "private",
      retentionDays: 30,
    });
    expect(validateRuntimeConfiguration()).toEqual([]);
  });

  it("rejects weak database credentials for private installations", () => {
    Object.assign(process.env, {
      DEPLOYMENT_VISIBILITY: "private",
      AUTH_URL: "http://localhost:3001",
      AUTH_SECRET: "0123456789abcdef0123456789abcdef",
      DATABASE_URL: "mysql://wallet:short@localhost:3306/wallet",
    });
    expect(validateRuntimeConfiguration()).toContain("DATABASE_PASSWORD_TOO_SHORT");
  });
});
