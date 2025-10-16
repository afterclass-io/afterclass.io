import { createTRPCRouter } from "@/server/api/trpc";

import { countByCourseCode } from "./countByCourseCode";
import { getAllByUniAbbrv } from "./getAllByUniAbbrv";
import { getByCourseCode } from "./getByCourseCode";
import { getBySlug } from "./getBySlug";
import { getProfessorsByClassId } from "@/server/api/professors/getByClassId";

export const professorsRouter = createTRPCRouter({
  countByCourseCode,
  getAllByUniAbbrv,
  getByCourseCode,
  getBySlug,
  getProfessorsByClassId
});
