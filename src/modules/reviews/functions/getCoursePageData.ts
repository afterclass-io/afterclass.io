import { cache } from "react";

import { api } from "@/common/tools/trpc/server";
import { getCourseByCode } from "@/modules/courses/functions/getByCode";

/**
 * Request-scoped fetch for a course page. `cache` dedupes it between
 * `generateMetadata`, the JSON-LD render and the preview-image metadata
 * within one request, exactly like `roadmaps/[id]/page.tsx`. The course lookup
 * itself is the shared, request-cached `getCourseByCode`, so the parallel
 * `@header`/`@information` slots reuse it instead of refetching.
 */
export const getCoursePageData = cache(async (code: string) => {
  const course = await getCourseByCode(code);
  if (!course) return null;

  const [{ averageRating, reviewCount, reviewLabels }, professorCount] =
    await Promise.all([
      api.reviews.getMetadataForCourse({ code }),
      api.professors.countByCourseCode({ courseCode: code }),
    ]);

  return { course, averageRating, reviewCount, reviewLabels, professorCount };
});
