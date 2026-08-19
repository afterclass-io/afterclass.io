import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { incrementEngagement } from "@/server/api/roadmaps/incrementEngagement";

/**
 * Increment a public roadmap's view counter. Called once per public-page
 * view (the client guards against double-fires via sessionStorage).
 *
 * Gate: only PUBLIC published roadmaps. Rate-limited to 5 increments per
 * client per minute to deter naive view-count farming.
 */
export const recordView = publicProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return {
      success: await incrementEngagement(ctx.db, { roadmapId: input.roadmapId, field: "viewCount" }, ctx.headers),
    };
  });
