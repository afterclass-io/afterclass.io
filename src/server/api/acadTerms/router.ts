import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { listAcadTerms, getCurrentAcadTerm } from "@/common/tools/acad-term";

export const acadTermsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return listAcadTerms(ctx.db);
  }),

  current: publicProcedure
    .input(z.object({ now: z.date().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return getCurrentAcadTerm(ctx.db, input?.now);
    }),
});
