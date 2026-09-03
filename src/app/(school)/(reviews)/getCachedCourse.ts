import { cache } from "react";
import { api } from "@/common/tools/trpc/server";

// One per-request cache instance shared by every slot of this route group
// (@header, @information, @reviews) so the course lookup runs once per request.
export const getCachedCourse = cache(async (code: string) => {
  return api.courses.getByCourseCode({ code: code.toUpperCase() });
});
