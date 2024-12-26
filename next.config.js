/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url";
import createJiti from "jiti";
const jiti = createJiti(fileURLToPath(import.meta.url));
// Import env here to validate during build. Using jiti we can import .ts files :)
jiti("./src/env");

import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const config = withSentryConfig(
  {
    reactStrictMode: true,

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
          permanent: false,
        },
        {
          // redirect old afterclass professor pages to new ones
          source: "/professor/smu-:path(.*)",
          destination: "/professor/:path",
          permanent: true,
        },
      ];
    },
    // This is required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
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
        // for proxying
        {
          source: "/ingest/static/:path*",
          destination: "https://us-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/ingest/:path*",
          destination: "https://us.i.posthog.com/:path*",
        },
        {
          source: "/ingest/decide",
          destination: "https://us.i.posthog.com/decide",
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

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  },
);

export default config;
