import { dataProcedure } from "@/server/api/trpc";
import { listReviews, reviewListInputs } from "../service";
import { publicReviewViewer } from "../viewer";

export const getByCourseCode = dataProcedure("reviews")
  .input(reviewListInputs.course)
  .query(async ({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: { kind: "course", code: input.code, profSlugs: input.slugs },
      page: input,
      viewer: await publicReviewViewer(),
    }),
  );
