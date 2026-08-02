import { createTRPCRouter } from "@/server/api/trpc";

import { setVisibility } from "./setVisibility";
import { getSharedTimetable } from "./getSharedTimetable";

export const sharingRouter = createTRPCRouter({
  setVisibility,
  getSharedTimetable,
});
