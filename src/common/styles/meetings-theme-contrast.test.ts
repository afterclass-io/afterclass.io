import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(
  path.resolve(import.meta.dirname, "meetings-theme.css"),
  "utf-8",
);

function readTokens(selector: RegExp): Record<string, string> {
  const block = selector.exec(css)?.[1] ?? "";
  const tokens: Record<string, string> = {};
  for (const m of block.matchAll(
    /(--mt-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g,
  )) {
    tokens[m[1]!] = m[2]!;
  }
  return tokens;
}

const light = readTokens(/^\.meetings-theme\s*\{([^}]+)\}/m);
const dark = readTokens(/^\.dark \.meetings-theme\s*\{([^}]+)\}/m);

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// WCAG 2.1 AA for normal-size text. The cards and labels use text-xs.
const AA = 4.5;
// popover is oklch(1 0 0) in the light theme.
const LIGHT_POPOVER = "#ffffff";

const gridDir = path.resolve(
  import.meta.dirname,
  "../../modules/meetings/components/grid",
);

// The palette token that a component uses for text colour, e.g.
// `text-(--mt-event-text)`. Reading it from the source keeps the test on the
// colours users actually see.
function textToken(file: string, nth = 0): string {
  const source = fs.readFileSync(path.join(gridDir, file), "utf-8");
  const tokens = [...source.matchAll(/text-\((--mt-[\w-]+)\)/g)].map(
    (m) => m[1]!,
  );
  const token = tokens[nth];
  if (!token) throw new Error(`no text-(--mt-*) class #${nth} in ${file}`);
  return token;
}

describe("meetings palette text contrast", () => {
  it("keeps event card text readable on the busy fill in light mode", () => {
    const text = textToken("MeetingCalendarOverlayLayer.tsx");
    expect(contrast(light[text]!, light["--mt-busy"]!)).toBeGreaterThanOrEqual(
      AA,
    );
  });

  it("keeps event card text readable on the busy fill in dark mode", () => {
    const text = textToken("MeetingCalendarOverlayLayer.tsx");
    expect(contrast(dark[text]!, dark["--mt-busy"]!)).toBeGreaterThanOrEqual(
      AA,
    );
  });

  it("keeps the Available label readable on the hover card in light mode", () => {
    const text = textToken("HeatmapHoverCard.tsx", 0);
    expect(contrast(light[text]!, LIGHT_POPOVER)).toBeGreaterThanOrEqual(AA);
  });

  it("keeps the If needed label readable on the hover card in light mode", () => {
    const text = textToken("HeatmapHoverCard.tsx", 1);
    expect(contrast(light[text]!, LIGHT_POPOVER)).toBeGreaterThanOrEqual(AA);
  });
});
