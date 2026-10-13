import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { REVIEW_ENGAGEMENT_BATCH_MAX } from "../constants";
import { loadReviewEngagement } from "../engagement";

export const getEngagement = protectedProcedure
  .input(
    z.object({
      reviewIds: z
        .array(z.string().min(1))
        .min(1)
        .max(REVIEW_ENGAGEMENT_BATCH_MAX),
    }),
  )
  .query(({ ctx, input }) =>
    loadReviewEngagement(ctx.db, ctx.session.user.id, input.reviewIds),
  );
