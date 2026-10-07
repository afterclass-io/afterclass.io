import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, requireVerified } from "@/server/api/trpc";
import {
  requireOwnedRoadmap,
  requireOwnedTimetable,
  mintToken,
} from "@/server/api/ownership";
import { hideRoadmap, hideTimetable } from "@/server/api/sharing/hide";

export const setVisibility = protectedProcedure
  .input(
    z.object({
      entity: z.enum(["timetable", "roadmap"]),
      id: z.string(),
      visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { entity, id, visibility } = input;

    if (entity === "timetable") {
      if (visibility === "PUBLIC") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Timetables can only be private or shared via link",
        });
      }

      const timetable = await requireOwnedTimetable(ctx.db, id, ctx.session.user.id);

      if (visibility === "PRIVATE") {
        // Clears BOTH the share link and the calendar feed token.
        await hideTimetable(ctx.db, id);
        return { visibility, shareToken: null };
      }

      const shareToken = timetable.shareToken ?? mintToken();

      await ctx.db.userTimetable.update({
        where: { id },
        data: { visibility, shareToken, icalToken: timetable.icalToken },
      });

      return { visibility, shareToken };
    } else {
      // roadmap — faculty is per-roadmap (set via roadmaps.setFaculty).
      const roadmap = await requireOwnedRoadmap(ctx.db, id, ctx.session.user.id, {
        shareToken: true,
        facultyId: true,
        publishedAt: true,
      });

      if (visibility === "PRIVATE") {
        await hideRoadmap(ctx.db, id);
        return { visibility, shareToken: null };
      }

      if (visibility === "PUBLIC") requireVerified(ctx.session.user);

      const shareToken = roadmap.shareToken ?? mintToken();

      await ctx.db.userRoadmap.update({
        where: { id },
        data: {
          visibility,
          shareToken,
          // Faculty stays on the roadmap row (per-roadmap, not per-user).
          ...(visibility === "PUBLIC"
            ? {
                facultyId: roadmap.facultyId,
                publishedAt: roadmap.publishedAt ?? new Date(),
              }
            : { publishedAt: null }),
        },
      });

      return { visibility, shareToken };
    }
  });
