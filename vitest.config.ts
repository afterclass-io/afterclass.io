import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load the repo's `.env` (with `${VAR}` expansion - e.g. `DATABASE_URL` references
  // `${POSTGRES_*}`) into the test environment so tests that import `@/env` - which
  // validates server env vars eagerly at module load - pass in a fresh shell with no
  // manual exports. Prefix `""` loads every variable. (`loadEnv` is exported from
  // `vite`, not `vitest/config`, in this dependency set.)
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // The repo's `tsconfig.json` uses `"jsx": "preserve"` (Next.js default), which
    // makes Vite's oxc transform leave JSX untouched - then `vite:import-analysis`
    // fails to parse `.tsx` test files ("Failed to parse source ... make sure to
    // not set jsx to preserve"). Force the automatic JSX runtime for test files.
    oxc: {
      jsx: { runtime: "automatic", importSource: "react" },
    },
    test: {
      include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.{ts,tsx}"],
      setupFiles: ["./vitest.setup.ts"],
      env,
      // Expose `describe`/`it`/`expect`/`afterEach` globals so
      // `@testing-library/react` can auto-register its `afterEach(cleanup)` -
      // without it, rendered widgets accumulate across tests in a file and text
      // queries match multiple stale nodes.
      globals: true,
      server: {
        deps: {
          // `next-auth` is normally externalized (loaded natively by Node), which
          // bypasses Vite's resolver and breaks on `next/server`. Inlining it lets
          // Vite resolve its imports through the alias below.
          inline: ["next-auth"],
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        // `next` ships no package.json `exports` map, so Node's ESM resolver
        // cannot find `next/server` (only `next/server.js` exists). Point the
        // bare specifier at the real file so vitest can load Next.js internals
        // (pulled in transitively via `next-auth` -> `next/server`).
        "next/server": path.resolve(
          import.meta.dirname,
          "./node_modules/next/server.js",
        ),
      },
    },
  };
});
