import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import { getReviewById } from "../service";
import { reviewViewerFor } from "../viewer";

export const getById = dataProcedure("reviews")
  .input(z.string())
  .query(async ({ ctx, input }) =>
    getReviewById(ctx.db, input, await reviewViewerFor(ctx.session)),
  );
