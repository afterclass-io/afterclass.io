/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
const jiti = createJiti(fileURLToPath(import.meta.url));
// Import env here to validate during build. Using jiti we can import .ts files :)
jiti("./src/env");

import { withSentryConfig } from "@sentry/nextjs/config";
import { withMcpUse } from "mcp-use/next";

/** @type {import("next").NextConfig} */
const config = withSentryConfig(
  {
    reactStrictMode: true,

    images: {
      // AVIF first: the browser's Accept header picks the best match, and the
      // optimiser falls back to WebP, then to the source format.
      formats: ["image/avif", "image/webp"],
      // Only these hosts may be optimised. The avatar host is a precondition
      // for serving avatars through next/image (#522). Google sign-in writes
      // `lh3.googleusercontent.com` pictures; the seeded and legacy profile
      // pictures live in the S3 bucket.
      remotePatterns: [
        {
          protocol: "https",
          hostname: "lh3.googleusercontent.com",
          pathname: "/**",
          search: "",
        },
        {
          protocol: "https",
          hostname: "afterclass-user-profile-pics.s3.amazonaws.com",
          pathname: "/**",
          search: "",
        },
      ],
    },

    compiler: {
      // Strip debug output from production bundles. `error` and `warn` stay.
      // `log` also stays: the assistant usage lines and the MCP write-audit
      // line are operational records for the server log pipeline. Each
      // console.log in app code carries an "intentional:" comment.
      removeConsole: { exclude: ["error", "warn", "log"] },
    },

    experimental: {
      // lucide-react, date-fns and recharts are optimised by default in
      // Next.js, so only the other large barrel packages are listed here.
      optimizePackageImports: [
        "@xyflow/react",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@radix-ui/react-dialog",
        "@radix-ui/react-alert-dialog",
      ],
    },

    // File tracing for the MCP view manifest: withMcpUse() only traces
    // .mcp-use/build into the /api/mcp function bundle, but the
    // /.well-known discovery route (src/app/.well-known) primes the same
    // manifest via createNextHandler — without this its bundle misses the
    // file and every request 500s with ENOENT. withMcpUse preserves
    // pre-existing keys when it merges its own entry.
    outputFileTracingIncludes: {
      "/.well-known": ["./.mcp-use/build/**/*"],
    },

    /**
     * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
     * out.
     *
     * @see https://github.com/vercel/next.js/issues/41980
     */
    // i18n: {
    //   locales: ["en"],
    //   defaultLocale: "en",
    // },
    async redirects() {
      return [
        {
          source: "/account/auth/verify",
          missing: [
            {
              type: "query",
              key: "email",
            },
          ],
          destination: "/not-found",
          permanent: false,
        },
        {
          source: "/reviews",
          destination: "/",
          permanent: true,
        },
        {
          source: "/guidelines",
          destination: "/terms#community-guidelines",
          permanent: true,
        },
        {
          // redirect old afterclass professor pages to new ones
          source: "/professor/smu-:path(.*)",
          destination: "/professor/:path",
          permanent: true,
        },
      ];
    },
    async rewrites() {
      return [
        // for multizonal deployments
        {
          source: "/statistics",
          destination: "/statistics/share/AglFdHLOFGYe2qNJ/afterclass.io",
        },
        {
          source: "/statistics/:match*",
          destination: "https://stats.afterclass.io/statistics/:match*",
        },
      ];
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "Document-Policy",
              value: "js-profiling",
            },
          ],
        },
      ];
    },
  },

  // Injected content via Sentry wizard below
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: "afterclass-io",
    project: "afterclass",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    bundleSizeOptimizations: {
      excludeDebugStatements: true,
    },

    _experimental: {
      turbopackReactComponentAnnotation: {
        enabled: true,
      },
    },
  },
);

// withMcpUse builds views at config-eval time (dev + prod), adds
// outputFileTracingIncludes for .mcp-use/build, and merges MCP CORS
// headers for /api/mcp/:path*. It returns a Promise — next.config.js
// supports top-level await.
export default await withMcpUse(
  /** @type {import("mcp-use/next").NextConfigLike} */ (config),
  {
    mcpDir: "src/mcp",
    viewsDir: "views",
    basePath: "/api/mcp",
  },
);
