import { defineConfig } from "vitest/config";
import path from "path";

const resolve = {
  alias: {
    "@": path.resolve(import.meta.dirname, "./src"),
    // next has no package.json `exports`; Node ESM cannot resolve
    // `next/server` when a test imports @/server/* transitively.
    "next/server": path.resolve(
      import.meta.dirname,
      "node_modules/next/server.js",
    ),
  },
};

const oxc = {
  jsx: { runtime: "automatic" as const, importSource: "react" },
};

// Dummy values satisfying `@/env`'s zod validation (required by
// `@/common/tools/zod/schemas`, which some procedures import for input
// validation). Neither project connects using these — the integration
// project's real Postgres connection string comes from Testcontainers at
// runtime, not from `@/env`.
const dummyEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS: "smu.edu.sg",
  NEXT_PUBLIC_AC_CHANNEL_LINK: "https://t.me/test",
  NEXT_PUBLIC_AC_HELPDESK_LINK: "https://t.me/test",
  NEXT_PUBLIC_AC_GITHUB_LINK: "https://github.com/test",
};

const server = { deps: { inline: ["next-auth"] } };

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/server/api/**/*.ts",
        "src/server/ecfg/**/*.ts",
        "src/modules/**/functions/**/*.ts",
        "src/modules/**/utils/**/*.ts",
        "src/modules/**/atoms/**/*.ts",
        "src/common/functions/**/*.ts",
        "src/common/hooks/**/*.ts",
        "src/common/tools/**/*.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.integration.test.ts",
        "src/server/api/trpc-test-helpers.ts", // mocked-caller test fixture
        "src/server/api/integration-test-helpers.ts", // integration seed fixture
        "**/router.ts", // tRPC router barrels
        "**/constants.ts",
        "**/types.ts",
        "**/*.d.ts",
        // Re-export barrels. Listed by exact path because procedure entrypoints
        // are also named index.ts and must stay in scope.
        "src/modules/auth/functions/index.ts",
        "src/modules/search/functions/index.ts",
        "src/common/functions/index.ts",
        "src/common/functions/crypto/index.ts",
        "src/common/hooks/index.ts",
        "src/server/ecfg/config.ts", // lone export of a static zod schema
        "src/common/functions/cn.ts", // one-line clsx/tailwind-merge wrapper
        // Passthrough procedures: a single findMany/findUnique with no
        // branching. A mocked unit test of these asserts the mock; they are
        // covered by the colocated *.integration.test.ts instead.
        "src/server/api/labels/getAll/index.ts", // labels/getAll/index.integration.test.ts
        "src/server/api/labels/getAllByType/index.ts", // labels/getAllByType/index.integration.test.ts
        "src/server/api/faculties/list/index.ts", // faculties/list/index.integration.test.ts
        "src/server/api/safetyFactors/getAll/index.ts", // safetyFactors/getAll/index.integration.test.ts
        "src/server/api/roadmaps/listMine/index.ts", // roadmaps/listMine/index.integration.test.ts
        "src/server/api/timetable/listMine/index.ts", // timetable/listMine/index.integration.test.ts
        "src/server/api/userBids/getByClassIds/index.ts", // userBids/index.integration.test.ts
        "src/server/api/userBids/listMine/index.ts", // userBids/index.integration.test.ts
      ],
      thresholds: process.env.SKIP_COVERAGE_THRESHOLDS
        ? undefined
        : {
            statements: 80,
            branches: 70,
            functions: 80,
            lines: 80,
          },
    },
    projects: [
      {
        resolve,
        oxc,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.{ts,tsx}"],
          exclude: ["**/*.integration.test.ts"],
          globals: true,
          env: dummyEnv,
          server,
        },
      },
      {
        resolve,
        oxc,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          globals: true,
          env: dummyEnv,
          server,
          globalSetup: ["./vitest.integration.setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
