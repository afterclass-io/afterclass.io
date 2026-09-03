import type { MetadataRoute } from "next";
import { api } from "@/common/tools/trpc/server";
import { env } from "@/env";

export const revalidate = 3600;

type PublicRoadmapsPage = Awaited<ReturnType<typeof api.roadmaps.listPublic>>;

async function fetchAllPublicRoadmaps(): Promise<
  Array<{ id: string; publishedAt: Date | null }>
> {
  const roadmaps: Array<{ id: string; publishedAt: Date | null }> = [];
  let cursor: string | undefined = undefined;

  do {
    // oxlint-disable-next-line eslint/no-await-in-loop
    const page: PublicRoadmapsPage = await api.roadmaps.listPublic({
      cursor,
      limit: 50,
    });
    for (const item of page.items) {
      roadmaps.push({
        id: item.roadmap.id,
        publishedAt: item.roadmap.publishedAt,
      });
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return roadmaps;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();

  const [courses, professors, roadmaps] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: "SMU" }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: "SMU" }),
    fetchAllPublicRoadmaps(),
  ]);

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/bidding`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/roadmaps`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...courses.map((course) => ({
      url: `${baseUrl}/course/${course.code}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...professors.map((prof) => ({
      url: `${baseUrl}/professor/${prof.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...roadmaps.map((roadmap) => ({
      url: `${baseUrl}/roadmaps/${roadmap.id}`,
      lastModified: roadmap.publishedAt ? new Date(roadmap.publishedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
