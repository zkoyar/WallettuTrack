import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  getRegisteredMessages,
  hasCompleteTranslation,
  resolveLocale,
  resolvePreferredLocale,
  translate,
} from "@/lib/i18n";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.tsx?$/.test(entry)
        ? [path]
        : [];
  });
}

describe("i18n", () => {
  it("normalizes supported regional locale tags", () => {
    expect(resolveLocale("it-IT")).toBe("it");
    expect(resolveLocale("de_DE")).toBe("de");
    expect(resolveLocale("fr-CA")).toBe("fr");
    expect(resolveLocale("es-ES")).toBeNull();
  });

  it("honors Accept-Language quality values", () => {
    expect(resolvePreferredLocale("en;q=0.4, de-DE;q=0.9, it;q=0.8")).toBe(
      "de"
    );
    expect(resolvePreferredLocale("es-ES, fr-FR;q=0.7")).toBe("fr");
    expect(resolvePreferredLocale(null)).toBe("en");
  });

  it("interpolates localized values and falls back safely", () => {
    expect(translate("it", "Hello {name}", { name: "Ada" })).toBe(
      "Ciao Ada"
    );
    expect(translate("de", "User-entered value")).toBe("User-entered value");
  });

  it("keeps every registered message complete", () => {
    expect(getRegisteredMessages().filter((key) => !hasCompleteTranslation(key)))
      .toEqual([]);
  });

  it("registers every literal UI translation call", () => {
    const roots = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];
    const callPattern = /\b(?:t|tr)\(\s*("(?:\\.|[^"\\])*")/g;
    const missing = new Set<string>();

    for (const file of roots.flatMap(sourceFiles)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(callPattern)) {
        const message = JSON.parse(match[1]) as string;
        if (!hasCompleteTranslation(message)) missing.add(message);
      }
    }

    expect([...missing].sort()).toEqual([]);
  });

  it("registers every literal API error shown by the UI", () => {
    const apiRoot = join(process.cwd(), "src", "app", "api");
    const errorPattern = /\bjsonError\(\s*("(?:\\.|[^"\\])*")/g;
    const missing = new Set<string>();

    for (const file of sourceFiles(apiRoot)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(errorPattern)) {
        const message = JSON.parse(match[1]) as string;
        if (!hasCompleteTranslation(message)) missing.add(message);
      }
    }

    expect([...missing].sort()).toEqual([]);
  });

  it("does not leave visible JSX text or accessibility labels untranslated", () => {
    const roots = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];
    const untranslated: string[] = [];
    const visibleAttributes = new Set(["alt", "aria-label", "placeholder", "title"]);
    const allowedText = new Set([
      "WallettuTrack",
      "Revolut",
      "date, type, category, amount, currency, description, notes",
    ]);

    for (const file of roots.flatMap(sourceFiles)) {
      const source = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      function visit(node: ts.Node) {
        if (ts.isJsxText(node)) {
          const text = node.text.replace(/\s+/g, " ").trim();
          if (/[A-Za-z]/.test(text) && !allowedText.has(text)) {
            untranslated.push(`${file}: ${text}`);
          }
        }

        if (
          ts.isJsxAttribute(node) &&
          visibleAttributes.has(node.name.getText(sourceFile)) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer)
        ) {
          const text = node.initializer.text.trim();
          if (/[A-Za-z]/.test(text) && text !== "you@example.com") {
            untranslated.push(
              `${file}: ${node.name.getText(sourceFile)}=${JSON.stringify(text)}`
            );
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
    }

    expect(untranslated).toEqual([]);
  });
});
