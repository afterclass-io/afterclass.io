import { createTRPCRouter } from "@/server/api/trpc";

import { count } from "./count";
import { create } from "./create";
import { getAll } from "./getAll";
import { getAllProtected } from "./getAllProtected";
import { getByCourseCode } from "./getByCourseCode";
import { getByCourseCodeProtected } from "./getByCourseCodeProtected";
import { getById } from "./getById";
import { getByProfSlug } from "./getByProfSlug";
import { getByProfSlugProtected } from "./getByProfSlugProtected";
import { getMetadataForCourse } from "./getMetadataForCourse";
import { getMetadataForProf } from "./getMetadataForProf";

export const reviewsRouter = createTRPCRouter({
  count,
  create,
  getAll,
  getAllProtected,
  getByCourseCode,
  getByCourseCodeProtected,
  getById,
  getByProfSlug,
  getByProfSlugProtected,
  getMetadataForCourse,
  getMetadataForProf,
});
