import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";
import { censorProfanity } from "@/server/profanity";
import { checkBudget } from "@/server/assistant/budget";
import { clientKey } from "@/server/api/engagement-limit";

export const getSharedRoadmap = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    // Per-IP throttle BEFORE the token lookup (mirrors the iCal route):
    // token-guessing spray against this unauthenticated endpoint draws
    // from a `shared:<ip>` fixed-window bucket (60/min). Over-limit
    // callers get TOO_MANY_REQUESTS; the token lookup never runs.
    const { ok } = await checkBudget(
      { user: { id: `shared:${clientKey(ctx.headers)}` } },
      { prefix: "shared", limit: 60, windowMs: 60_000, kind: "read" },
    );
    if (!ok) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    // PRIVATE rows are excluded in the lookup itself (mirrors getFeedData):
    // a PRIVATE row with a lingering token is invisible, not just refused.
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { shareToken: input.token, visibility: { not: "PRIVATE" } },
      select: {
        id: true,
        name: true,
        user: {
          select: { username: true },
        },
        entries: {
          select: {
            courseId: true,
            yearNumber: true,
            term: true,
            course: {
              select: {
                code: true,
                name: true,
                creditUnits: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!roadmap) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const ownerUsername = censorProfanity(roadmap.user.username);

    return {
      roadmap: {
        ...roadmap,
        name: censorProfanity(roadmap.name),
        // Keep the `user` shape but never ship the raw username.
        user: { ...roadmap.user, username: ownerUsername },
      },
      entries: roadmap.entries,
      ownerUsername,
    };
  });
