import { dataProcedure } from "@/server/api/trpc";
import { listReviews, reviewListInputs } from "../service";

export const getByCourseCode = dataProcedure("reviews")
  .input(reviewListInputs.course)
  .query(({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: { kind: "course", code: input.code, profSlugs: input.slugs },
      page: input,
      viewer: { kind: "public" },
    }),
  );
