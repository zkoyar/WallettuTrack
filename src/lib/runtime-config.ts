export type DeploymentVisibility = "private" | "public";

export interface PrivacyConfiguration {
  controllerName: string;
  contactEmail: string;
  retentionDays: number;
  visibility: DeploymentVisibility;
}

function looksLikePlaceholder(value: string): boolean {
  return /(?:generate|insert|change[-_ ]?me|replace[-_ ]?me|example|placeholder)/i.test(
    value
  );
}

export function getSourceCodeUrl(): string | undefined {
  try {
    const url = new URL(process.env.SOURCE_CODE_URL ?? "");
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function configuredVisibility(): DeploymentVisibility {
  const explicit = process.env.DEPLOYMENT_VISIBILITY?.trim().toLowerCase();
  if (explicit === "public" || explicit === "private") return explicit;

  try {
    const authUrl = new URL(process.env.AUTH_URL ?? "http://localhost");
    return authUrl.protocol === "https:" &&
      !authUrl.hostname.match(/^(localhost|127\.0\.0\.1|::1)$/)
      ? "public"
      : "private";
  } catch {
    return "private";
  }
}

export function getPrivacyConfiguration(): PrivacyConfiguration {
  const retention = Number(process.env.PRIVACY_RETENTION_DAYS ?? 30);
  return {
    controllerName:
      process.env.PRIVACY_CONTROLLER_NAME?.trim() || "Installation operator",
    contactEmail:
      process.env.PRIVACY_CONTACT_EMAIL?.trim() || "not-configured@example.invalid",
    retentionDays: Number.isInteger(retention) && retention > 0 ? retention : 30,
    visibility: configuredVisibility(),
  };
}

export function validateRuntimeConfiguration(): string[] {
  const issues: string[] = [];
  const privacy = getPrivacyConfiguration();
  const authSecret = process.env.AUTH_SECRET ?? "";

  if (authSecret.length < 32 || looksLikePlaceholder(authSecret)) {
    issues.push("AUTH_SECRET_WEAK");
  }

  let authUrl: URL | null = null;
  try {
    authUrl = new URL(process.env.AUTH_URL ?? "");
  } catch {
    issues.push("AUTH_URL_INVALID");
  }

  let databaseUrl: URL | null = null;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL ?? "");
    if (!["mysql:", "mariadb:"].includes(databaseUrl.protocol)) {
      issues.push("DATABASE_URL_PROTOCOL_INVALID");
    }
  } catch {
    issues.push("DATABASE_URL_INVALID");
  }

  const databasePassword = (() => {
    try {
      return decodeURIComponent(databaseUrl?.password ?? "");
    } catch {
      return databaseUrl?.password ?? "";
    }
  })();
  if (databasePassword.length < 24 || looksLikePlaceholder(databasePassword)) {
    issues.push("DATABASE_PASSWORD_TOO_SHORT");
  }

  if (privacy.visibility === "public") {
    if (authUrl?.protocol !== "https:") issues.push("PUBLIC_AUTH_URL_MUST_USE_HTTPS");
    if (!process.env.PRIVACY_CONTROLLER_NAME?.trim()) {
      issues.push("PRIVACY_CONTROLLER_NAME_MISSING");
    }
    const email = process.env.PRIVACY_CONTACT_EMAIL?.trim() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push("PRIVACY_CONTACT_EMAIL_INVALID");
    }
    if (
      process.env.REGISTRATION_MODE?.trim().toLowerCase() === "open" &&
      process.env.ALLOW_PUBLIC_REGISTRATION !== "true"
    ) {
      issues.push("PUBLIC_REGISTRATION_NOT_ACKNOWLEDGED");
    }
    if (!getSourceCodeUrl()) {
      issues.push("SOURCE_CODE_URL_INVALID");
    }
  }

  return issues;
}
