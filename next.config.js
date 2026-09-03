/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";
import { createJiti } from "jiti";
const jiti = createJiti(fileURLToPath(import.meta.url));
// Import env here to validate during build. Using jiti we can import .ts files :)
await jiti.import("./src/env");

const config = withSentryConfig(
  {
    reactStrictMode: true,

    images: {
      // Serve AVIF/WebP when the client supports them
      formats: ["image/avif", "image/webp"],
      // Precondition for serving Google account avatars (user.photoUrl) via next/image (#514)
      remotePatterns: [
        {
          protocol: "https",
          hostname: "lh3.googleusercontent.com",
        },
      ],
    },

    experimental: {
      // Tree-shake large packages without touching application code (#514)
      optimizePackageImports: [
        "lucide-react",
        "date-fns",
        "recharts",
        "@xyflow/react",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@radix-ui/react-dialog",
        "rc-slider",
        "driver.js",
        "cmdk",
        "@number-flow/react",
      ],
    },

    compiler: {
      // Drop console statements from production builds, keep errors and warnings (#514)
      removeConsole: {
        exclude: ["error", "warn"],
      },
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
    // Document-Policy: js-profiling header removed with browserProfilingIntegration (#505).
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

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

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

export default config;
