import { createTRPCRouter } from "@/server/api/trpc";

import { courses } from "./courses";
import { professors } from "./professors";

export const searchRouter = createTRPCRouter({
  courses,
  professors,
});
