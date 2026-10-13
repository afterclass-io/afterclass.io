import { publicProcedure } from "@/server/api/trpc";
import { listReviews, reviewListInputs } from "../service";

export const getAll = publicProcedure
  .input(reviewListInputs.all)
  .query(({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: {
        kind: "all",
        universityId: input.universityId,
        courseId: input.courseId,
        profId: input.profId,
      },
      page: input,
      viewer: { kind: "public" },
    }),
  );
