import type { MetadataRoute } from "next";

import { buildRobots } from "@/common/tools/seo";
import { env } from "@/env";

/**
 * Generated rather than a static `public/robots.txt` so a preview deployment
 * can blanket-disallow a host that would otherwise compete with production.
 * Both values come from the validated env schema, never from `process.env`
 * directly.
 */
export default function robots(): MetadataRoute.Robots {
  return buildRobots(env.NEXTAUTH_URL, env.VERCEL_ENV);
}
