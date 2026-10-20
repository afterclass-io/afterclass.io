import { dataProcedure } from "@/server/api/trpc";
import { listReviews, reviewListInputs } from "../service";
import { publicReviewViewer } from "../viewer";

export const getAll = dataProcedure("reviews")
  .input(reviewListInputs.all)
  .query(async ({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: {
        kind: "all",
        universityId: input.universityId,
        courseId: input.courseId,
        profId: input.profId,
      },
      page: input,
      viewer: await publicReviewViewer(),
    }),
  );
