import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { loadCopyableRoadmap } from "../copyRoadmap";
import { copyRoadmapMappingErrors } from "../copy-errors";

export const copyPublic = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const source = await loadCopyableRoadmap(ctx.db, { id: input.roadmapId });

    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // The roadmap already belongs to the caller — copying it is pure spam
    // (they can edit the original directly in their own account).
    if (source.userId === ctx.session.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot copy your own roadmap",
      });
    }

    return copyRoadmapMappingErrors(ctx.db, source, ctx.session.user.id);
  });
