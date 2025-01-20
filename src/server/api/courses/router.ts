import { createTRPCRouter } from "@/server/api/trpc";

import { countByProfSlug } from "./countByProfSlug";
import { getAllByUniAbbrv } from "./getAllByUniAbbrv";
import { getByCourseCode } from "./getByCourseCode";
import { getByProfSlug } from "./getByProfSlug";

export const coursesRouter = createTRPCRouter({
  countByProfSlug,
  getAllByUniAbbrv,
  getByCourseCode,
  getByProfSlug,
});
