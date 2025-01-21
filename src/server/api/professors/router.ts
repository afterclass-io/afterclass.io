import { createTRPCRouter } from "@/server/api/trpc";

import { countByCourseCode } from "./countByCourseCode";
import { getAllByUniAbbrv } from "./getAllByUniAbbrv";
import { getByCourseCode } from "./getByCourseCode";
import { getBySlug } from "./getBySlug";

export const professorsRouter = createTRPCRouter({
  countByCourseCode,
  getAllByUniAbbrv,
  getByCourseCode,
  getBySlug,
});
