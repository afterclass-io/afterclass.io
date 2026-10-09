import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";
import { censorProfanity } from "@/server/profanity";
import { toArrangedClass } from "@/modules/timetable/functions/arranged-class";
import { checkBudget } from "@/server/assistant/budget";
import { clientKey } from "@/server/api/client-key";

export const getSharedTimetable = publicProcedure
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
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { shareToken: input.token, visibility: { not: "PRIVATE" } },
      include: {
        user: {
          select: { username: true },
        },
        slots: {
          include: {
            class: {
              include: {
                course: true,
                professor: true,
                classTimings: true,
                classExamTimings: true,
              },
            },
          },
        },
      },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const slots = timetable.slots.map((slot) => toArrangedClass(slot));

    return {
      timetable: {
        name: censorProfanity(timetable.name),
        ownerUsername: censorProfanity(timetable.user.username),
      },
      slots,
    };
  });
