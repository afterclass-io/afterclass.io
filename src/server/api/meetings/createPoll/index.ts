import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "@/server/api/trpc";
import { checkAndIncrement } from "@/server/assistant/ratelimit";
import randomId from "@/common/functions/randomId";
import {
  assertValidWindow,
  createPollInput,
  POLLS_PER_HOUR,
  requireCurrentTerm,
} from "../helpers";

export const createPoll = protectedProcedure
  .input(createPollInput)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const rateLimit = await checkAndIncrement(
      `meeting_poll_create:${userId}`,
      POLLS_PER_HOUR,
      60,
    );
    if (!rateLimit.ok) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      });
    }

    const term = await requireCurrentTerm(ctx.db);
    assertValidWindow(input, term);

    if (input.courseId && input.section) {
      const offered = await ctx.db.classes.findFirst({
        where: {
          courseId: input.courseId,
          section: input.section,
          acadTermId: term.id,
        },
        select: { id: true },
      });
      if (!offered) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `That class is not offered in the current term (${term.label})`,
        });
      }
    }

    const poll = await ctx.db.meetingPoll.create({
      data: {
        slug: randomId(10),
        title: input.title,
        description: input.description ?? null,
        agenda: input.agenda ?? null,
        links: input.links,
        startDate: new Date(`${input.startDate}T00:00:00Z`),
        endDate: new Date(`${input.endDate}T00:00:00Z`),
        startHour: input.startHour,
        endHour: input.endHour,
        creatorId: userId,
        courseId: input.courseId ?? null,
        section: input.section ?? null,
        teamIdentifier: input.teamIdentifier ?? null,
        acadTermId: term.id,
      },
      select: { id: true, slug: true },
    });

    return { slug: poll.slug, id: poll.id };
  });
