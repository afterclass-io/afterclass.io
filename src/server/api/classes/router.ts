import { getAllByCourseId } from "@/server/api/classes/getAllByCourseId";
import { createTRPCRouter } from "@/server/api/trpc";

export const classesRouter = createTRPCRouter({
  getAllByCourseId,
});
