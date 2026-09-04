import { rm } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  ".next",
  "coverage",
  "src/generated/prisma",
  "next-env.d.ts",
  "tsconfig.tsbuildinfo",
  "dev-server.log",
  "prod-server.log",
  "server.log",
  ".release-tmp",
];

const removeDependencies = process.argv.includes("--dependencies");

if (removeDependencies) {
  targets.push("node_modules");
}

for (const target of targets) {
  const absoluteTarget = resolve(projectRoot, target);
  const pathFromRoot = relative(projectRoot, absoluteTarget);

  if (!pathFromRoot || pathFromRoot.startsWith("..")) {
    throw new Error(`Invalid cleanup path: ${target}`);
  }

  await rm(absoluteTarget, { force: true, recursive: true });
}

console.log(
  removeDependencies
    ? "Full cleanup complete: npm modules were also removed. Run npm ci to restore them."
    : "Cleanup complete: caches, logs, and generated files were removed.",
);
