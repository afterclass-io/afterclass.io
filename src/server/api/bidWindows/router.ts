import { getByAcadTerm } from "@/server/api/bidWindows/getByAcadTerm";
import { getCurrentWindow } from "@/server/api/bidWindows/getCurrentWindow";
import { createTRPCRouter } from "@/server/api/trpc";

export const bidWindowsRouter = createTRPCRouter({
  getByAcadTerm,
  getCurrentWindow,
});
