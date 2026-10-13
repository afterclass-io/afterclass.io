import { getBy } from "@/server/api/bidResults/getBy";
import { getByCourseProfessor } from "@/server/api/bidResults/getByCourseProfessor";
import { getVacanciesByClassIds } from "@/server/api/bidResults/getVacanciesByClassIds";
import { createTRPCRouter } from "@/server/api/trpc";

export const bidResultsRouter = createTRPCRouter({
  getBy,
  getByCourseProfessor,
  getVacanciesByClassIds,
});
