import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
// Spec pattern: /\b(?:hsl|hsla|rgb|rgba)\(\s*var\(--/
// In Tailwind arbitrary classes (e.g. shadow-[...]), underscores replace spaces,
// so we match both standard word boundaries and Tailwind underscores.
const specPattern = /\b(?:hsl|hsla|rgb|rgba)\(\s*var\(--/;
const tailwindPattern = /_(?:hsl|hsla|rgb|rgba)\(\s*var\(--/;

function scanDirectory(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const violations: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(repoRoot, fullPath).replace(/\\/g, "/");

    if (relPath === "src/generated" || relPath.startsWith("src/generated/")) {
      continue;
    }

    if (entry.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && /\.(?:ts|tsx|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (specPattern.test(line) || tailwindPattern.test(line)) {
          violations.push(`${relPath}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }

  return violations;
}

describe("no-hsl-wrapped-tokens", () => {
  it("does not wrap CSS variables in hsl() or rgb() functions", () => {
    const violations = [
      ...scanDirectory(path.join(repoRoot, "src")),
      ...scanDirectory(path.join(repoRoot, "views")),
    ];

    expect(
      violations,
      violations.length > 0
        ? `Found ${violations.length} token wrapper violation(s):\n${violations.join("\n")}`
        : undefined,
    ).toEqual([]);
  });
});
