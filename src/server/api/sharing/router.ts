import { createTRPCRouter } from "@/server/api/trpc";

import { setVisibility } from "./setVisibility";
import { getSharedTimetable } from "./getSharedTimetable";
import { getSharedRoadmap } from "./getSharedRoadmap";
import { copyShared } from "./copyShared";

export const sharingRouter = createTRPCRouter({
  setVisibility,
  getSharedTimetable,
  getSharedRoadmap,
  copyShared,
});
