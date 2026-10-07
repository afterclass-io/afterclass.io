import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";

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
          select: { id: true, acadYearStart: true, acadYearEnd: true, term: true },
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
    return polls.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      startDate: p.startDate,
      endDate: p.endDate,
      startHour: p.startHour,
      endHour: p.endHour,
      slotDurationMinutes: p.slotDurationMinutes,
      isCreator: p.creatorId === ctx.session.user.id,
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
    }));
  });
