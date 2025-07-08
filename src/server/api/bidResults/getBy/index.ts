import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const HARD_LIMIT = 200; // hard limit to prevent too many results

export const getBy = publicProcedure
  .input(
    z.object({
      section: z.string().optional(),
      courseCode: z.string().optional(),
      classId: z.string().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    if (input.courseCode && input.section) {
      return await ctx.db.bidResult.findMany({
        include: {
          bidWindow: true,
          class: true,
        },
        where: {
          class: {
            section: input.section,
            course: {
              code: input.courseCode,
            },
          },
        },
        take: HARD_LIMIT,
      });
    }

    if (!input.classId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "classId is required when courseCode and section are not provided",
      });
    }

    const _class = await ctx.db.classes.findUnique({
      include: {
        course: {
          select: {
            code: true,
          },
        },
      },
      where: {
        id: input.classId,
      },
    });

    if (!_class) {
      return [];
    }

    return await ctx.db.bidResult.findMany({
      include: {
        bidWindow: true,
        class: true,
      },
      where: {
        class: {
          section: _class.section,
          course: {
            code: _class.course.code,
          },
        },
      },
      take: HARD_LIMIT,
    });
  });
