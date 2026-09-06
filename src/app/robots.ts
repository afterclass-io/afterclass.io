import type { MetadataRoute } from "next";

import { env } from "@/env";

/**
 * Generates the robots.txt file for the site.
 *
 * Deployment environment gating:
 * - Non-production (development, preview): Disallows all crawlers from all routes
 *   to avoid duplicate content indexation and preview-domain competition.
 * - Production: Allows general crawling while disallowing internal API endpoints,
 *   authenticated screens, review submission, and search result pages.
 *
 * Both configurations declare the sitemap location.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");

  if (env.VERCEL_ENV !== "production") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/auth/", "/submit", "/search"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
