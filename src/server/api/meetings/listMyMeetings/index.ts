import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { censorProfanity, censorProfanityOrNull } from "@/server/profanity";

export const listMyMeetings = protectedProcedure
  .input(z.void().optional())
  .query(async ({ ctx }) => {
    const polls = await ctx.db.meetingPoll.findMany({
      where: {
        OR: [
          { creatorId: ctx.session.user.id },
          { participants: { some: { userId: ctx.session.user.id } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        startHour: true,
        endHour: true,
        slotDurationMinutes: true,
        creatorId: true,
        course: {
          select: { id: true, code: true, name: true },
        },
        section: true,
        teamIdentifier: true,
        acadTerm: {
          select: {
            id: true,
            acadYearStart: true,
            acadYearEnd: true,
            term: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { participants: true },
        },
        participants: {
          where: { userId: ctx.session.user.id },
          select: { availableSlots: true, ifNeededSlots: true },
          take: 1,
        },
      },
    });

    // Zero Users.id exposure: creatorId stripped and mapped to isCreator boolean
    // Polls the caller created keep their raw text (the caller wrote it);
    // polls created by others are masked.
    return polls.map((p) => {
      const isCreator = p.creatorId === ctx.session.user.id;
      return {
        id: p.id,
        slug: p.slug,
        title: isCreator ? p.title : censorProfanity(p.title),
        description: isCreator
          ? p.description
          : censorProfanityOrNull(p.description),
        startDate: p.startDate,
        endDate: p.endDate,
        startHour: p.startHour,
        endHour: p.endHour,
        slotDurationMinutes: p.slotDurationMinutes,
        isCreator,
        course: p.course,
        section: p.section,
        teamIdentifier: p.teamIdentifier,
        acadTerm: p.acadTerm,
        participantCount: p._count.participants,
        hasResponded:
          (p.participants[0]?.availableSlots.length ?? 0) +
            (p.participants[0]?.ifNeededSlots.length ?? 0) >
          0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  });
