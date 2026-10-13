import { cache } from "react";

import { api } from "@/common/tools/trpc/server";

/**
 * Request-scoped professor lookup. The `@header` and `@reviews` segments of a
 * professor page render in parallel and each needs the professor, so `cache`
 * runs the query once per request and shares the result.
 */
export const getProfessorBySlug = cache((slug: string) =>
  api.professors.getBySlug({ slug }),
);
