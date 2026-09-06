import type { MetadataRoute } from "next";

import { env } from "@/env";
import { api } from "@/common/tools/trpc/server";

export const revalidate = 86400;

type ListPublicOutput = Awaited<ReturnType<typeof api.roadmaps.listPublic>>;

/**
 * Generates the sitemap for the site.
 *
 * Revalidated every 24 hours (86400 seconds) using ISR to protect the database
 * from crawler load.
 *
 * Enumerates:
 * - Static public routes: home, roadmaps, bidding
 * - Course pages via SMU course catalogue
 * - Professor pages via SMU professor catalogue
 * - Public user roadmaps via cursor-paginated public procedure
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");

  const [courses, professors] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: "SMU" }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: "SMU" }),
  ]);

  const roadmapUrls: MetadataRoute.Sitemap = [];
  const seenCursors = new Set<string>();
  const MAX_ROADMAP_PAGES = 50;
  let cursor: string | undefined = undefined;
  let pages = 0;

  do {
    if (cursor && seenCursors.has(cursor)) break;
    if (cursor) seenCursors.add(cursor);
    if (++pages > MAX_ROADMAP_PAGES) break;

    const page: ListPublicOutput = await api.roadmaps
      .listPublic({
        limit: 50,
        cursor,
      })
      .catch(() => ({ items: [], nextCursor: null }));

    for (const item of page.items) {
      roadmapUrls.push({
        url: `${baseUrl}/roadmaps/${item.roadmap.id}`,
      });
    }

    const next: string | undefined = page.nextCursor ?? undefined;
    if (!next || next === cursor) break;
    cursor = next;
  } while (cursor);

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/` },
    { url: `${baseUrl}/roadmaps` },
    { url: `${baseUrl}/bidding` },
    { url: `${baseUrl}/bidding/analytics` },
  ];

  const courseUrls: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${baseUrl}/course/${c.code}`,
  }));

  const professorUrls: MetadataRoute.Sitemap = professors.map((p) => ({
    url: `${baseUrl}/professor/${p.slug}`,
  }));

  return [...staticUrls, ...courseUrls, ...professorUrls, ...roadmapUrls];
}
