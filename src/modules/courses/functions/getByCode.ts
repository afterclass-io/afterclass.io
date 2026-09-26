import { cache } from "react";

import { api } from "@/common/tools/trpc/server";

/**
 * Request-scoped course lookup. `cache` dedupes calls that share this function
 * object and the same code within one request, so the parallel route slots
 * (`@header`/`@information`) and the page-data helpers resolve the course once.
 */
export const getCourseByCode = cache(
  async (code: string) => await api.courses.getByCourseCode({ code }),
);

/**
 * Request-scoped professor lookup, deduped per request like
 * {@link getCourseByCode}.
 */
export const getProfessorBySlug = cache(
  async (slug: string) => await api.professors.getBySlug({ slug }),
);
