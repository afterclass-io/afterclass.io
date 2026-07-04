import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const getByAcadTerm = publicProcedure
  .input(
    z.object({
      acadTermId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const acadTerm = await ctx.db.acadTerm.findUnique({
      where: { id: input.acadTermId },
      include: {
        bidWindow: {
          orderBy: [{ round: "asc" }, { window: "asc" }],
        },
      },
    });

    if (!acadTerm) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Academic term ${input.acadTermId} not found`,
      });
    }

    // Return opensAt/closesAt/resultsAt directly from the database.
    // These are pre-computed at INSERT time (by the BidlySMU pipeline
    // or seed scripts) — no query-time derivation needed.
    return acadTerm.bidWindow.map((bw) => ({
      id: bw.id,
      acadTermId: bw.acadTermId,
      round: bw.round,
      window: bw.window,
      opensAt: bw.opensAt,
      closesAt: bw.closesAt,
      resultsAt: bw.resultsAt,
    }));
  });
