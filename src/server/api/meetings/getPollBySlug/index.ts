import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "@/server/api/trpc";
import { formatUserDisplayName } from "@/common/functions/format-user-display-name";

export const getPollBySlug = publicProcedure
  .input(
    z.object({
      slug: z.string().min(6).max(20),
    }),
  )
  .query(async ({ ctx, input }) => {
    const poll = await ctx.db.meetingPoll.findUnique({
      where: { slug: input.slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        agenda: true,
        links: true,
        creatorId: true, // Internal only, mapped to isCreator
        startDate: true,
        endDate: true,
        startHour: true,
        endHour: true,
        slotDurationMinutes: true,
        course: {
          select: { id: true, code: true, name: true },
        },
        section: true,
        teamIdentifier: true,
        acadTerm: {
          select: { id: true, acadYearStart: true, acadYearEnd: true, term: true },
        },
        participants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            userId: true, // Internal only, NEVER returned in response
            user: { select: { firstName: true, lastName: true } },
            availableSlots: true,
            ifNeededSlots: true,
          },
        },
      },
    });

    if (!poll) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meeting poll not found",
      });
    }

    // In-memory heatmap aggregation (O(P * S))
    const heatmap: Record<
      number,
      { availableCount: number; ifNeededCount: number }
    > = {};
    for (const p of poll.participants) {
      for (const slot of p.availableSlots) {
        const entry = heatmap[slot] ?? { availableCount: 0, ifNeededCount: 0 };
        entry.availableCount += 1;
        heatmap[slot] = entry;
      }
      for (const slot of p.ifNeededSlots) {
        const entry = heatmap[slot] ?? { availableCount: 0, ifNeededCount: 0 };
        entry.ifNeededCount += 1;
        heatmap[slot] = entry;
      }
    }

    const currentUserId = ctx.session?.user?.id;

    // Strict serialization: zero Users.id exposure
    return {
      poll: {
        id: poll.id,
        slug: poll.slug,
        title: poll.title,
        description: poll.description,
        agenda: poll.agenda,
        links: poll.links,
        isCreator: Boolean(currentUserId && poll.creatorId === currentUserId),
        startDate: poll.startDate,
        endDate: poll.endDate,
        startHour: poll.startHour,
        endHour: poll.endHour,
        slotDurationMinutes: poll.slotDurationMinutes,
        course: poll.course,
        section: poll.section,
        teamIdentifier: poll.teamIdentifier,
        acadTerm: poll.acadTerm,
      },
      participants: poll.participants.map((p) => ({
        participantId: p.id,
        name: formatUserDisplayName(p.user),
        availableSlots: p.availableSlots,
        ifNeededSlots: p.ifNeededSlots,
        isCurrentUser: Boolean(currentUserId && p.userId === currentUserId),
      })),
      heatmap,
    };
  });
