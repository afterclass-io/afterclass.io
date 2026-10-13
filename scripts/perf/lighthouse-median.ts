import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

// `bun run scripts/perf/lighthouse-median.ts <baseUrl> [runs] [path...]`
// Runs the Lighthouse CLI against a production server (`next start`) and prints
// the median of each lab metric. Default profile: Lighthouse 12 mobile preset
// (simulated 4x CPU slowdown, 150 ms RTT, 1.6 Mbit/s down). Set CHROME_PATH when
// Chrome is not on the default path. Set VIEWPORT=1024x768 to measure a
// desktop-class viewport instead (Lighthouse "desktop" form factor at that
// size). The sidebar flip lives between 768 and 1249 px, which the default
// 412 px mobile preset never reaches. See docs/perf/README.md.

const DEFAULT_PATHS = ["/", "/course/IS215", "/bidding/analytics"];
const LIGHTHOUSE = "lighthouse@12.8.2";

const reportSchema = z.object({
  lighthouseVersion: z.string(),
  audits: z.record(
    z.string(),
    z.object({ numericValue: z.number().optional() }),
  ),
});

const METRICS = [
  ["TTFB (ms)", "server-response-time"],
  ["FCP (ms)", "first-contentful-paint"],
  ["LCP (ms)", "largest-contentful-paint"],
  ["TBT (ms)", "total-blocking-time"],
  ["CLS", "cumulative-layout-shift"],
  ["Speed Index (ms)", "speed-index"],
] as const;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

const baseUrl = process.argv[2];
if (!baseUrl) {
  throw new Error("usage: lighthouse-median.ts <baseUrl> [runs] [path...]");
}
const runs = Number(process.argv[3] ?? 3);
const paths = process.argv.length > 4 ? process.argv.slice(4) : DEFAULT_PATHS;
const viewport = /^(\d+)x(\d+)$/.exec(process.env.VIEWPORT ?? "");
const viewportFlags = viewport
  ? [
      "--form-factor=desktop",
      "--screenEmulation.mobile=false",
      `--screenEmulation.width=${viewport[1]}`,
      `--screenEmulation.height=${viewport[2]}`,
      "--screenEmulation.deviceScaleFactor=1",
    ]
  : [];
const workDir = mkdtempSync(join(tmpdir(), "lighthouse-"));

try {
  for (const path of paths) {
    const samples: Record<string, number[]> = {};
    let version = "";
    for (let run = 0; run < runs; run++) {
      const out = join(workDir, `run-${run}.json`);
      const result = spawnSync(
        "npx",
        [
          "--yes",
          LIGHTHOUSE,
          `${baseUrl}${path}`,
          "--output=json",
          `--output-path=${out}`,
          "--only-categories=performance",
          "--chrome-flags=--headless=new --no-sandbox",
          "--quiet",
          ...viewportFlags,
        ],
        { stdio: "inherit", shell: true },
      );
      if (result.status !== 0) {
        throw new Error(`lighthouse failed on ${path} (run ${run})`);
      }
      const report = reportSchema.parse(JSON.parse(readFileSync(out, "utf8")));
      version = report.lighthouseVersion;
      for (const [label, id] of METRICS) {
        const value = report.audits[id]?.numericValue;
        if (value !== undefined) (samples[label] ??= []).push(value);
      }
    }
    console.log(
      `\n${path}  (Lighthouse ${version}, median of ${runs}${viewport ? `, ${viewport[0]}` : ", mobile preset"})`,
    );
    for (const [label] of METRICS) {
      const values = samples[label] ?? [];
      const formatted = label === "CLS" ? 3 : 0;
      console.log(
        `  ${label}: ${median(values).toFixed(formatted)}  [${values.map((v) => v.toFixed(formatted)).join(", ")}]`,
      );
    }
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
