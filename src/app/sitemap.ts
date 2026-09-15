import type { MetadataRoute } from "next";

import { buildSitemap, drainCursorPages } from "@/common/tools/seo";
import { env } from "@/env";
import { createCaller } from "@/server/api/root";
import { db } from "@/server/db";

/**
 * Enumerates every course and professor from the public catalogue procedures
 * plus the public roadmaps, so crawl discovery does not depend on in-page link
 * topology.
 *
 * The tRPC context is built by hand with no session lookup and no `headers()`,
 * so this file uses no Request-time API and Next statically generates and
 * caches the route at build time (`sitemap.js` doc: "cached by default unless
 * it uses a Request-time API or dynamic config option"). Do NOT switch to the
 * RSC caller in `@/common/tools/trpc/server` — it reads `headers()` and would
 * force the route dynamic.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = createCaller({ db, session: null, headers: new Headers() });

  // SMU is the only university with a catalogue on this site; the course and professor routes are not university-scoped.
  const school = "SMU" as const;

  const [courses, professors, roadmaps] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: school }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: school }),
    drainCursorPages(async (cursor) => {
      const page = await api.roadmaps.listPublic({ cursor });
      return {
        items: page.items.map((item) => item.roadmap),
        nextCursor: page.nextCursor,
      };
    }),
  ]);

  return buildSitemap(env.NEXTAUTH_URL, { courses, professors, roadmaps });
}
