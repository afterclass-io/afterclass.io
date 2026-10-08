import { getAll } from "@/server/api/classes/getAll";
import { getAllByCourseId } from "@/server/api/classes/getAllByCourseId";
import { resolveByCodeSections } from "@/server/api/classes/resolveByCodeSections";
import { createTRPCRouter } from "@/server/api/trpc";

export const classesRouter = createTRPCRouter({
  getAllByCourseId,
  getAll,
  resolveByCodeSections,
});
