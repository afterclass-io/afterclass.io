import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedPoll } from "@/server/api/ownership";
import { meetingLinksSchema } from "@/modules/meetings/functions/meeting-links";
import { MAX_AGENDA_LENGTH } from "@/modules/meetings/functions/meeting-limits";

export const updatePoll = protectedProcedure
  .input(
    z.object({
      slug: z.string().min(6).max(20),
      title: z.string().trim().min(1).max(120).optional(),
      description: z.string().max(500).nullish(),
      agenda: z.string().max(MAX_AGENDA_LENGTH).nullish(),
      links: meetingLinksSchema.optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { slug, ...fields } = input;
    const poll = await requireOwnedPoll(ctx.db, { slug }, ctx.session.user.id, {
      id: true,
    });

    await ctx.db.meetingPoll.update({
      where: { id: poll.id },
      data: {
        title: fields.title,
        description: fields.description,
        agenda: fields.agenda,
        links: fields.links,
      },
    });
    return { success: true };
  });
