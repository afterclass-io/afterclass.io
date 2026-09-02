import { ReviewReactionType } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getByRoadmapId = publicProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      eventType: z.nativeEnum(ReviewReactionType).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const reactions = await ctx.db.roadmapReaction.findMany({
      where: {
        roadmapId: input.roadmapId,
        reaction: input.eventType,
      },
      select: { reaction: true, userId: true },
    });

    const aggregated = new Map<ReviewReactionType, number>();
    let viewerReaction: ReviewReactionType | undefined;

    for (const r of reactions) {
      aggregated.set(r.reaction, (aggregated.get(r.reaction) ?? 0) + 1);
      if (r.userId === ctx.session?.user?.id) {
        viewerReaction = r.reaction;
      }
    }

    const counts = Array.from(aggregated, ([reaction, count]) => ({
      reaction,
      count,
    }));

    return { counts, viewerReaction: viewerReaction ?? null };
  });
