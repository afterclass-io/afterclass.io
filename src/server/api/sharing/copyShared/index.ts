import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from "@/server/db-errors";
import {
  copyRoadmapToUser,
  loadCopyableRoadmap,
} from "@/server/api/roadmaps/copyRoadmap";

/**
 * Copy a roadmap that was shared with the caller (via its share token) into
 * the caller's account. Works for private roadmaps too — the share token is
 * the access secret — so recipients of a private share link can adopt the
 * plan for their own use.
 */
export const copyShared = protectedProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const source = await loadCopyableRoadmap(ctx.db, {
      shareToken: input.token,
    });

    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    try {
      return await copyRoadmapToUser(ctx.db, source, ctx.session.user.id);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot copy this roadmap — it contains an unknown course.",
        });
      }
      if (isUniqueConstraintViolation(err)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Duplicate course detected — refresh and try again.",
        });
      }
      throw err;
    }
  });
