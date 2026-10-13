import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

// Each class below names a colour that is not in the theme. Tailwind v4
// emits no CSS for it, so the element silently loses its border, fill or
// text colour. The value is the class to use instead.
const PHANTOM_CLASSES: Record<string, string> = {
  "border-border-default": "border-border",
  "bg-border-elevated": "bg-border (or hover:bg-sidebar-accent for a hover)",
  "bg-border-primary": "bg-primary",
  "text-secondary-default":
    "text-secondary-foreground (or no class on a dark surface)",
  "text-text-on-tertiary": "text-muted-foreground",
  "text-text-em-high": "text-foreground",
};

const classTokenPattern = (name: string) =>
  new RegExp(`(?<![A-Za-z0-9_-])${name}(?![A-Za-z0-9_-])`);

function scan(dir: string): string[] {
  const hits: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(repoRoot, fullPath).split(path.sep).join("/");
    if (rel === "src/generated") continue;
    if (entry.isDirectory()) {
      hits.push(...scan(fullPath));
    } else if (
      /\.(?:ts|tsx)$/.test(entry.name) &&
      !entry.name.includes(".test.")
    ) {
      const lines = fs.readFileSync(fullPath, "utf-8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const [name, instead] of Object.entries(PHANTOM_CLASSES)) {
          if (classTokenPattern(name).test(line))
            hits.push(`${rel}:${i + 1}: ${name} (use ${instead})`);
        }
      });
    }
  }
  return hits;
}

describe("no phantom Tailwind classes", () => {
  it("uses no colour class that the theme does not define", () => {
    const hits = [
      ...scan(path.join(repoRoot, "src")),
      ...scan(path.join(repoRoot, "views")),
    ];
    expect(hits).toEqual([]);
  });
});
