import { cache } from "react";

import { api } from "@/common/tools/trpc/server";

/**
 * Request-scoped course lookup. The `@header`, `@information` and `@reviews`
 * segments of a course page render in parallel and each needs the course, so
 * `cache` runs the query once per request and shares the result.
 */
export const getCourseByCode = cache((code: string) =>
  api.courses.getByCourseCode({ code }),
);
