import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { incrementEngagement } from "@/server/api/roadmaps/incrementEngagement";

/**
 * Increment a public roadmap's share counter. Called when someone copies
 * a share/public link to the roadmap.
 *
 * Gate: only PUBLIC published roadmaps. Rate-limited to 5 increments per
 * client per minute to deter naive share-count farming.
 */
export const recordShare = publicProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return {
      success: await incrementEngagement(
        ctx.db,
        { roadmapId: input.roadmapId, field: "shareCount" },
        ctx.headers,
      ),
    };
  });
