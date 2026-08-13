import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import {
  requireOwnedRoadmap,
  requireOwnedTimetable,
  mintToken,
} from "@/server/api/ownership";

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

      let shareToken: string | null = timetable.shareToken;
      let icalToken: string | null = timetable.icalToken;

      if (visibility === "UNLISTED") {
        shareToken ??= mintToken();
      } else {
        // PRIVATE — clear BOTH the share link and the calendar feed token.
        shareToken = null;
        icalToken = null;
      }

      await ctx.db.userTimetable.update({
        where: { id },
        data: { visibility, shareToken, icalToken },
      });

      return { visibility, shareToken };
    } else {
      // roadmap — faculty is per-roadmap (set via roadmaps.setFaculty).
      const roadmap = await requireOwnedRoadmap(ctx.db, id, ctx.session.user.id, {
        shareToken: true,
        facultyId: true,
        publishedAt: true,
      });

      if (visibility === "PUBLIC" && !ctx.session.user.isVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only verified users can publish roadmaps",
        });
      }

      let shareToken: string | null = roadmap.shareToken;

      if (visibility === "UNLISTED" || visibility === "PUBLIC") {
        shareToken ??= mintToken();
      } else {
        // PRIVATE — clear the token
        shareToken = null;
      }

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
