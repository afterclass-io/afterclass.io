import { protectedProcedure } from "@/server/api/trpc";
import {
  includeEngagementInput,
  listReviews,
  reviewListInputs,
} from "../service";

export const getByCourseCodeProtected = protectedProcedure
  .input(reviewListInputs.course.extend(includeEngagementInput.shape))
  .query(({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: { kind: "course", code: input.code, profSlugs: input.slugs },
      page: input,
      viewer: {
        kind: "member",
        userId: ctx.session.user.id,
        includeEngagement: input.includeEngagement,
      },
    }),
  );
