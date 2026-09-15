import { cache } from "react";

import { api } from "@/common/tools/trpc/server";

/**
 * Request-scoped fetch for a course page. `cache` dedupes it between
 * `generateMetadata`, the JSON-LD render and the preview-image metadata
 * within one request, exactly like `roadmaps/[id]/page.tsx`.
 */
export const getCoursePageData = cache(async (code: string) => {
  const course = await api.courses.getByCourseCode({ code });
  if (!course) return null;

  const { averageRating, reviewCount, reviewLabels } =
    await api.reviews.getMetadataForCourse({ code });
  const professorCount = await api.professors.countByCourseCode({
    courseCode: code,
  });

  return { course, averageRating, reviewCount, reviewLabels, professorCount };
});
