import { createTRPCRouter } from "@/server/api/trpc";

import { getArrangement } from "./getArrangement";
import { getBidWindows } from "./getBidWindows";
import { searchCourses } from "./searchCourses";
import { listMine } from "./listMine";
import { create } from "./create";
import { rename } from "./rename";
import { remove } from "./remove";
import { setActive } from "./setActive";
import { addSlot } from "./addSlot";
import { removeSlot } from "./removeSlot";
import { setSlotSection } from "./setSlotSection";
import { getOrCreateIcalToken } from "./getOrCreateIcalToken";
import { revokeIcalToken } from "./revokeIcalToken";

export const timetableRouter = createTRPCRouter({
  getArrangement,
  getBidWindows,
  searchCourses,
  listMine,
  create,
  rename,
  remove,
  setActive,
  addSlot,
  removeSlot,
  setSlotSection,
  getOrCreateIcalToken,
  revokeIcalToken,
});
