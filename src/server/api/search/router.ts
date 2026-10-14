import { createTRPCRouter } from "@/server/api/trpc";

import { courses } from "./courses";
import { professors } from "./professors";
import { courseResults, professorResults } from "./results";

export const searchRouter = createTRPCRouter({
  courses,
  professors,
  courseResults,
  professorResults,
});
