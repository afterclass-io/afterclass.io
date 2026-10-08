import { protectedProcedure } from "@/server/api/trpc";
import {
  includeEngagementInput,
  listReviews,
  reviewListInputs,
} from "../service";

export const getAllProtected = protectedProcedure
  .input(reviewListInputs.all.extend(includeEngagementInput.shape))
  .query(({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: {
        kind: "all",
        universityId: input.universityId,
        courseId: input.courseId,
        profId: input.profId,
      },
      page: input,
      viewer: {
        kind: "member",
        userId: ctx.session.user.id,
        includeEngagement: input.includeEngagement,
      },
    }),
  );
