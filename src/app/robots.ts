import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function robots(): MetadataRoute.Robots {
  const isProduction = env.VERCEL_ENV === "production";

  return {
    rules: isProduction
      ? {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/account/auth/", "/submit", "/search"],
        }
      : {
          userAgent: "*",
          disallow: "/",
        },
    sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_SITE_URL).toString(),
  };
}
