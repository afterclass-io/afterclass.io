import { createTRPCRouter } from "@/server/api/trpc";

import { getAllByType } from "./getAllByType";
import { getByProfSlug } from "./getByProfSlug";
import { countByCourseCode } from "./countByCourseCode";

export const reviewLabelsRouter = createTRPCRouter({
  getAllByType,
  getByProfSlug,
  countByCourseCode,
});
