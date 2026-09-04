import { describe, expect, it } from "vitest";
import { withDatabasePoolDefaults } from "@/lib/database-url";

describe("withDatabasePoolDefaults", () => {
  it("adds conservative limits to the MariaDB pool", () => {
    const url = new URL(
      withDatabasePoolDefaults("mysql://user:password@localhost:3306/wallettutrack")
    );

    expect(url.searchParams.get("connectionLimit")).toBe("5");
    expect(url.searchParams.get("minimumIdle")).toBe("1");
    expect(url.searchParams.get("idleTimeout")).toBe("300");
    expect(url.searchParams.get("connectTimeout")).toBe("2000");
    expect(url.searchParams.get("acquireTimeout")).toBe("5000");
    expect(url.searchParams.get("allowPublicKeyRetrieval")).toBe("true");
  });

  it("preserves explicitly configured options", () => {
    const url = new URL(
      withDatabasePoolDefaults(
        "mariadb://user:password@db:3306/wallettutrack?connectionLimit=8&minimumIdle=2"
      )
    );

    expect(url.searchParams.get("connectionLimit")).toBe("8");
    expect(url.searchParams.get("minimumIdle")).toBe("2");
  });

  it("does not include the input connection string in errors", () => {
    const secret = "password-super-segreta";

    expect(() => withDatabasePoolDefaults(`invalid-${secret}`)).toThrow(
      "Invalid DATABASE_URL"
    );

    try {
      withDatabasePoolDefaults(`invalid-${secret}`);
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
