import { dataProcedure } from "@/server/api/trpc";
import { listReviews, reviewListInputs } from "../service";

export const getByProfSlug = dataProcedure("reviews")
  .input(reviewListInputs.professor)
  .query(({ ctx, input }) =>
    listReviews(ctx.db, {
      scope: {
        kind: "professor",
        slug: input.slug,
        universityId: input.universityId,
        courseCodes: input.courseCodes,
      },
      page: input,
      viewer: { kind: "public" },
    }),
  );
