import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
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
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2003") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Failed to copy roadmap — source contains an invalid course",
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
