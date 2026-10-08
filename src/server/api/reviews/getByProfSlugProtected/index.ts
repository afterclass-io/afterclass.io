import { protectedProcedure } from "@/server/api/trpc";
import {
  includeEngagementInput,
  listReviews,
  reviewListInputs,
} from "../service";

export const getByProfSlugProtected = protectedProcedure
  .input(reviewListInputs.professor.extend(includeEngagementInput.shape))
  .query(({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: {
        kind: "professor",
        slug: input.slug,
        universityId: input.universityId,
        courseCodes: input.courseCodes,
      },
      page: input,
      viewer: {
        kind: "member",
        userId: ctx.session.user.id,
        includeEngagement: input.includeEngagement,
      },
    }),
  );
