import { getLatest } from "@/server/api/acadTerms/getLatest";
import { createTRPCRouter } from "@/server/api/trpc";

export const acadTermsRouter = createTRPCRouter({
  getLatest,
});
