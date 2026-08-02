import { createTRPCRouter } from "@/server/api/trpc";

import { listMine } from "./listMine";
import { getMine } from "./getMine";
import { create } from "./create";
import { rename } from "./rename";
import { remove } from "./remove";
import { saveEntries } from "./saveEntries";
import { searchCourses } from "./searchCourses";
import { publish } from "./publish";
import { unpublish } from "./unpublish";
import { listPublic } from "./listPublic";
import { getById } from "./getById";
import { copyPublic } from "./copyPublic";
import { setActive } from "./setActive";
import { setMatricTerm } from "./setMatricTerm";
import { syncProgress } from "./syncProgress";
import { recordView } from "./recordView";
import { recordShare } from "./recordShare";

export const roadmapsRouter = createTRPCRouter({
  listMine,
  getMine,
  create,
  rename,
  remove,
  saveEntries,
  searchCourses,
  publish,
  unpublish,
  listPublic,
  getById,
  copyPublic,
  setActive,
  setMatricTerm,
  syncProgress,
  recordView,
  recordShare,
});
