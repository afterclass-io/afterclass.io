import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.{ts,tsx}"],
    globals: true,
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // next has no package.json `exports`; Node ESM cannot resolve
      // `next/server` when a test imports @/server/* transitively.
      "next/server": path.resolve(
        import.meta.dirname,
        "node_modules/next/server.js",
      ),
    },
  },
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" },
  },
});
