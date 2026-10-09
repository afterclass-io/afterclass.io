import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { z } from "zod";

// `bun run scripts/perf/bundle-size.ts [routes...]` after `next build`.
// Prints first-load JavaScript per route and the total emitted client assets.
// Route sizes come from the build's own `.next/diagnostics/route-bundle-stats.json`.
// Record the output in `docs/perf/` next to the build SHA.

const NEXT_DIR = resolve(import.meta.dirname, "../../.next");
const DEFAULT_ROUTES = ["/", "/course/[code]", "/bidding/analytics"];

const routeStatsSchema = z.array(
  z.object({
    route: z.string(),
    firstLoadUncompressedJsBytes: z.number(),
    firstLoadChunkPaths: z.array(z.string()),
  }),
);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

function gzipBytes(files: string[]): number {
  return files.reduce(
    (sum, file) => sum + gzipSync(readFileSync(file)).byteLength,
    0,
  );
}

const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;

const stats = routeStatsSchema.parse(
  JSON.parse(
    readFileSync(join(NEXT_DIR, "diagnostics/route-bundle-stats.json"), "utf8"),
  ),
);
const wanted = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_ROUTES;

console.log("| Route | First-load JS (raw) | First-load JS (gzip) | Chunks |");
console.log("|---|---|---|---|");
for (const route of wanted) {
  const entry = stats.find((s) => s.route === route);
  if (!entry) {
    console.log(`| ${route} | not in build | | |`);
    continue;
  }
  const files = entry.firstLoadChunkPaths.map((p) =>
    resolve(NEXT_DIR, "..", p.replaceAll("\\", "/")),
  );
  console.log(
    `| ${route} | ${kib(entry.firstLoadUncompressedJsBytes)} | ${kib(gzipBytes(files))} | ${files.length} |`,
  );
}

const staticFiles = walk(join(NEXT_DIR, "static"));
const sumBy = (ext: RegExp) =>
  staticFiles
    .filter((f) => ext.test(f))
    .reduce((sum, f) => sum + statSync(f).size, 0);
console.log("");
console.log(`Total .next/static JS: ${kib(sumBy(/\.js$/))}`);
console.log(`Total .next/static CSS: ${kib(sumBy(/\.css$/))}`);
console.log(
  `Total .next/static fonts and media: ${kib(sumBy(/\.(woff2?|ttf|otf|ico|png|jpe?g|svg|webp|avif)$/))}`,
);
