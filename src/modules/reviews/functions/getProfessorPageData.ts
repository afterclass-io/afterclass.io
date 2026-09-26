import { cache } from "react";

import { api } from "@/common/tools/trpc/server";
import { getProfessorBySlug } from "@/modules/courses/functions/getByCode";

/**
 * Request-scoped fetch for a professor page. `cache` dedupes it between
 * `generateMetadata`, the JSON-LD render and the preview-image metadata
 * within one request, exactly like `roadmaps/[id]/page.tsx`. The professor
 * lookup itself is the shared, request-cached `getProfessorBySlug`, so the
 * parallel `@header` slot reuses it instead of refetching.
 */
export const getProfessorPageData = cache(async (slug: string) => {
  const professor = await getProfessorBySlug(slug);
  if (!professor) return null;

  const [{ averageRating, reviewCount, reviewLabels }, courseCount] =
    await Promise.all([
      api.reviews.getMetadataForProf({ slug }),
      api.courses.countByProfSlug({ slug }),
    ]);

  return { professor, averageRating, reviewCount, reviewLabels, courseCount };
});
