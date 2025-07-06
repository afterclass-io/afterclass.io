import { getLatest } from "@/server/api/acadTerm/getLatest";
import { createTRPCRouter } from "@/server/api/trpc";

export const acadTermRouter = createTRPCRouter({
  getLatest,
});
