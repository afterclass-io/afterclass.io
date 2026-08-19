import { createTRPCRouter } from "@/server/api/trpc";

import { updateFaculty } from "./updateFaculty";

export const usersRouter = createTRPCRouter({
  updateFaculty,
});
