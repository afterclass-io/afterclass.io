import { cache } from "react";

import { api } from "@/common/tools/trpc/server";

/**
 * Request-scoped fetch for a professor page. `cache` dedupes it between
 * `generateMetadata`, the JSON-LD render and the preview-image metadata
 * within one request, exactly like `roadmaps/[id]/page.tsx`.
 */
export const getProfessorPageData = cache(async (slug: string) => {
  const professor = await api.professors.getBySlug({ slug });
  if (!professor) return null;

  const { averageRating, reviewCount, reviewLabels } =
    await api.reviews.getMetadataForProf({ slug });
  const courseCount = await api.courses.countByProfSlug({ slug });

  return { professor, averageRating, reviewCount, reviewLabels, courseCount };
});
