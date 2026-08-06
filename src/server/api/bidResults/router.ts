import { getBy } from "@/server/api/bidResults/getBy";
import { getByCourseProfessor } from "@/server/api/bidResults/getByCourseProfessor";
import { createTRPCRouter } from "@/server/api/trpc";

export const bidResultsRouter = createTRPCRouter({
  getBy,
  getByCourseProfessor,
});
