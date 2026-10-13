import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { TOKENS } from "./tokens";

// MCP views cannot import the app's CSS, so TOKENS copies a few theme values.
// This test keeps each copy equal to its source in shadcn.css.
const css = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../src/common/styles/shadcn.css"),
  "utf-8",
);

function readVars(selector: RegExp): Record<string, string> {
  const block = selector.exec(css)?.[1] ?? "";
  const vars: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]!] = m[2]!.trim();
  }
  return vars;
}

const web = {
  light: readVars(/^:root\s*\{([^}]+)\}/m),
  dark: readVars(/^\.dark\s*\{([^}]+)\}/m),
};

const SHARED_TOKENS = {
  card: "--card",
  cardFg: "--card-foreground",
  mutedFg: "--muted-foreground",
  muted: "--muted",
  border: "--border",
  primary: "--primary",
  primaryFg: "--primary-foreground",
  radius: "--radius",
} as const;

describe("MCP view tokens match the web theme", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const [name, cssVar] of Object.entries(SHARED_TOKENS)) {
      it(`${theme} ${name} equals ${cssVar}`, () => {
        // --radius is declared once, in :root.
        const expected = web[theme][cssVar] ?? web.light[cssVar];
        expect(TOKENS[theme][name as keyof typeof SHARED_TOKENS]).toBe(
          expected,
        );
      });
    }
  }
});
