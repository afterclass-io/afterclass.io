import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { loadCopyableRoadmap } from "@/server/api/roadmaps/copyRoadmap";
import { copyRoadmapMappingErrors } from "@/server/api/roadmaps/copy-errors";

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

    return copyRoadmapMappingErrors(ctx.db, source, ctx.session.user.id);
  });
