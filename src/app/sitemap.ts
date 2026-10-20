import type { MetadataRoute } from "next";

import { buildSitemap, drainCursorPages } from "@/common/tools/seo";
import { env } from "@/env";
import { createCaller } from "@/server/api/root";
import { db } from "@/server/db";
import type { PublicDataDomain } from "@/server/ecfg/config";
import { isDataPublic } from "@/server/ecfg/public-data";

/**
 * Enumerates every course and professor from the public catalogue procedures
 * plus the public roadmaps, so crawl discovery does not depend on in-page link
 * topology. Only domains that are public to anonymous visitors are listed: the
 * caller below is anonymous, so a private domain must never be fetched.
 *
 * The tRPC context is built by hand with no session lookup and no `headers()`,
 * so this file uses no Request-time API and Next statically generates and
 * caches the route at build time (`sitemap.js` doc: "cached by default unless
 * it uses a Request-time API or dynamic config option"). Do NOT switch to the
 * RSC caller in `@/common/tools/trpc/server` — it reads `headers()` and would
 * force the route dynamic.
 */
// Edge Config flips change what is listed, so the cached sitemap must not live
// until the next deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // SMU is the only university with a catalogue on this site; the course and professor routes are not university-scoped.
  const school = "SMU" as const;

  const api = createCaller({ db, session: null, headers: new Headers() });

  // A course or professor page is indexable when its own domain is public
  // (see its `generateMetadata`); its reviews are gated on the page itself.
  const [coursesPublic, professorsPublic, roadmapsPublic, classDataPublic] =
    await Promise.all([
      isDataPublic("courses"),
      isDataPublic("professors"),
      isDataPublic("publicRoadmaps"),
      isDataPublic("classData"),
    ]);
  const privateDomains: PublicDataDomain[] = [];
  if (!roadmapsPublic) privateDomains.push("publicRoadmaps");
  if (!classDataPublic) privateDomains.push("classData");

  const [courses, professors, roadmaps] = await Promise.all([
    coursesPublic
      ? api.courses.getAllByUniAbbrv({ universityAbbrv: school })
      : [],
    professorsPublic
      ? api.professors.getAllByUniAbbrv({ universityAbbrv: school })
      : [],
    roadmapsPublic
      ? drainCursorPages(async (cursor) => {
          const page = await api.roadmaps.listPublic({ cursor });
          return {
            items: page.items.map((item) => item.roadmap),
            nextCursor: page.nextCursor,
          };
        })
      : [],
  ]);

  return buildSitemap(env.NEXT_PUBLIC_SITE_URL, {
    courses,
    professors,
    roadmaps,
    privateDomains,
  });
}
