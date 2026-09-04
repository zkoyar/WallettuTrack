import { describe, expect, it } from "vitest";
import { pickSelectedAccount } from "@/lib/account-selection";

const accounts = [
  { id: "account-1", name: "Primary" },
  { id: "account-2", name: "Savings" },
];

describe("pickSelectedAccount", () => {
  it("uses the requested account when it belongs to the list", () => {
    expect(pickSelectedAccount(accounts, "account-2")?.id).toBe("account-2");
  });

  it("falls back to the first account for a missing or invalid cookie", () => {
    expect(pickSelectedAccount(accounts, null)?.id).toBe("account-1");
    expect(pickSelectedAccount(accounts, "unknown")?.id).toBe("account-1");
  });

  it("returns null when no accounts exist", () => {
    expect(pickSelectedAccount([], "account-1")).toBeNull();
  });
});
