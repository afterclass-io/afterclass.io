import { dataProcedure } from "@/server/api/trpc";
import { listReviews, reviewListInputs } from "../service";

// The feed is about one professor, so both domains must be public.
export const getByProfSlug = dataProcedure("reviews", "professors")
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
