import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { copyRoadmapToUser, loadCopyableRoadmap } from "../copyRoadmap";

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

    try {
      return await copyRoadmapToUser(ctx.db, source, ctx.session.user.id);
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2003") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to copy roadmap — source contains an invalid course",
          });
        }
        if (code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Duplicate course detected — refresh and try again.",
          });
        }
      }
      throw err;
    }
  });
