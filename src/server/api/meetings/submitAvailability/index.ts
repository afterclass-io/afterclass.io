import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "@/server/api/trpc";
import { calculateTotalSlots, slotListSchema } from "../helpers";

export const submitAvailability = protectedProcedure
  .input(
    z.object({
      slug: z.string(),
      availableSlots: slotListSchema,
      ifNeededSlots: slotListSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const poll = await ctx.db.meetingPoll.findUnique({
      where: { slug: input.slug },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        startHour: true,
        endHour: true,
        slotDurationMinutes: true,
      },
    });

    if (!poll) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meeting poll not found",
      });
    }

    const totalSlots = calculateTotalSlots(poll);

    // Validate slot bounds against poll dimensions
    for (const slot of input.availableSlots) {
      if (slot >= totalSlots) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Slot index ${slot} exceeds total available slots (${totalSlots})`,
        });
      }
    }
    for (const slot of input.ifNeededSlots) {
      if (slot >= totalSlots) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Slot index ${slot} exceeds total available slots (${totalSlots})`,
        });
      }
    }

    // Reject slot duplicate collision across arrays
    const ifNeededSet = new Set(input.ifNeededSlots);
    for (const slot of input.availableSlots) {
      if (ifNeededSet.has(slot)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Slot ${slot} cannot be marked as both available and if-needed`,
        });
      }
    }

    const participant = await ctx.db.meetingParticipant.upsert({
      where: {
        pollId_userId: {
          pollId: poll.id,
          userId: ctx.session.user.id,
        },
      },
      update: {
        availableSlots: input.availableSlots,
        ifNeededSlots: input.ifNeededSlots,
      },
      create: {
        pollId: poll.id,
        userId: ctx.session.user.id,
        availableSlots: input.availableSlots,
        ifNeededSlots: input.ifNeededSlots,
      },
      select: {
        id: true,
      },
    });

    return {
      participantId: participant.id,
      success: true,
    };
  });
