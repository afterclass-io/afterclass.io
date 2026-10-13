import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import cases from "./warning-contrast.cases.json";

interface TestCase {
  theme: "light" | "dark";
  fg: string;
  bg: string;
  overlay?: {
    token: string;
    alpha: number;
  };
  min: number;
}

const cssPath = path.resolve(import.meta.dirname, "shadcn.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

function extractBlock(content: string, selectorPattern: RegExp): string {
  const match = selectorPattern.exec(content);
  return match?.[1] ?? "";
}

function parseVariables(blockContent: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const regex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(blockContent)) !== null) {
    const key = match[1];
    const val = match[2];
    if (key && val) {
      vars[key] = val.trim();
    }
  }
  return vars;
}

const themeInlineContent = extractBlock(
  cssContent,
  /@theme\s+inline\s*\{([^}]+)\}/,
);
const rootContent = extractBlock(cssContent, /:root\s*\{([^}]+)\}/);
const darkContent = extractBlock(cssContent, /\.dark\s*\{([^}]+)\}/);

const rootVars = parseVariables(rootContent);
const darkVars = parseVariables(darkContent);

function getTokenValue(theme: "light" | "dark", tokenName: string): string {
  if (theme === "dark") {
    const val = darkVars[tokenName] ?? rootVars[tokenName];
    if (!val) {
      throw new Error(`Token ${tokenName} not found in .dark or :root`);
    }
    return val;
  }
  const val = rootVars[tokenName];
  if (!val) {
    throw new Error(`Token ${tokenName} not found in :root`);
  }
  return val;
}

function parseOklch(value: string): [number, number, number] {
  const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(value);
  const lStr = match?.[1];
  const cStr = match?.[2];
  const hStr = match?.[3];
  if (!lStr || !cStr || !hStr) {
    throw new Error(`Invalid OKLCH color: ${value}`);
  }
  return [parseFloat(lStr), parseFloat(cStr), parseFloat(hStr)];
}

function oklchToSrgb(
  L: number,
  C: number,
  h: number,
): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Clip linear components to [0, 1]
  const rClip = Math.min(Math.max(rLin, 0), 1);
  const gClip = Math.min(Math.max(gLin, 0), 1);
  const bClip = Math.min(Math.max(bLin, 0), 1);

  // Gamma-encoded sRGB in [0, 255]
  const gamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  return [
    Math.min(Math.max(gamma(rClip), 0), 1) * 255,
    Math.min(Math.max(gamma(gClip), 0), 1) * 255,
    Math.min(Math.max(gamma(bClip), 0), 1) * 255,
  ];
}

function blend(
  bg: [number, number, number],
  fg: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ];
}

function srgbToLinear(c: number): number {
  const cNorm = c / 255;
  return cNorm <= 0.04045
    ? cNorm / 12.92
    : Math.pow((cNorm + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function contrastRatio(
  color1: [number, number, number],
  color2: [number, number, number],
): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("warning token contrast", () => {
  it("declares --color-warning-text in @theme inline", () => {
    expect(themeInlineContent).toMatch(
      /--color-warning-text\s*:\s*var\(--warning-text\)/,
    );
  });

  it("declares --warning-text and --warning-foreground in :root and .dark", () => {
    expect(rootVars["--warning-text"]).toBeDefined();
    expect(rootVars["--warning-foreground"]).toBeDefined();
    expect(darkVars["--warning-text"]).toBeDefined();
    expect(darkVars["--warning-foreground"]).toBeDefined();
  });

  it.each(cases as TestCase[])(
    "$theme theme: $fg on $bg satisfies WCAG AA (>= $min:1)",
    (testCase) => {
      const [lFg, cFg, hFg] = parseOklch(
        getTokenValue(testCase.theme, testCase.fg),
      );
      const fgRgb = oklchToSrgb(lFg, cFg, hFg);

      const [lBg, cBg, hBg] = parseOklch(
        getTokenValue(testCase.theme, testCase.bg),
      );
      let bgRgb = oklchToSrgb(lBg, cBg, hBg);

      if (testCase.overlay) {
        const [lOverlay, cOverlay, hOverlay] = parseOklch(
          getTokenValue(testCase.theme, testCase.overlay.token),
        );
        const overlayRgb = oklchToSrgb(lOverlay, cOverlay, hOverlay);
        bgRgb = blend(bgRgb, overlayRgb, testCase.overlay.alpha);
      }

      const ratio = contrastRatio(fgRgb, bgRgb);
      expect(ratio).toBeGreaterThanOrEqual(testCase.min);
    },
  );
});
