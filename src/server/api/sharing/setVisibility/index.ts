import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

import { protectedProcedure } from "@/server/api/trpc";

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
      const timetable = await ctx.db.userTimetable.findUnique({
        where: { id },
      });

      if (!timetable || timetable.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      let shareToken: string | null = timetable.shareToken;

      if (visibility === "UNLISTED" || visibility === "PUBLIC") {
        shareToken ??= nanoid(21);
      } else {
        // PRIVATE — clear the token
        shareToken = null;
      }

      await ctx.db.userTimetable.update({
        where: { id },
        data: { visibility, shareToken },
      });

      return { visibility, shareToken };
    } else {
      // roadmap
      const roadmap = await ctx.db.userRoadmap.findUnique({
        where: { id },
      });

      if (!roadmap || roadmap.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Public roadmaps go through the publish path: only verified users may
      // publish, and publishing snapshots the owner's faculty for gallery
      // filtering. There is no UI to set faculty on private roadmaps — it
      // always comes from the owner's verified profile at publish time.
      if (visibility === "PUBLIC" && !ctx.session.user.isVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only verified users can publish roadmaps",
        });
      }

      let shareToken: string | null = roadmap.shareToken;

      if (visibility === "UNLISTED" || visibility === "PUBLIC") {
        shareToken ??= nanoid(21);
      } else {
        // PRIVATE — clear the token
        shareToken = null;
      }

      await ctx.db.userRoadmap.update({
        where: { id },
        data: {
          visibility,
          shareToken,
          ...(visibility === "PUBLIC"
            ? {
                facultyId: ctx.session.user.facultyId,
                publishedAt: roadmap.publishedAt ?? new Date(),
              }
            : { publishedAt: null }),
        },
      });

      return { visibility, shareToken };
    }
  });
