import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts",
  },
  datasource: {
    // Used by the Prisma CLI (migrate, studio, db seed) — bypasses pgbouncer.
    url: env("DIRECT_URL"),
  },
});
