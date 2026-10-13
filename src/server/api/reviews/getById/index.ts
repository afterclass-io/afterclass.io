import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { getReviewById } from "../service";

export const getById = protectedProcedure
  .input(z.string())
  .query(({ ctx, input }) => getReviewById(ctx.db, input, ctx.session.user.id));
