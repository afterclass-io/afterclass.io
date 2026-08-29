import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getAcadYearCutoff } from "@/server/api/bidResults/acad-year-window";
import { findBidResults } from "@/server/api/bidResults/findBidResults";

export const getBy = publicProcedure
  .input(
    z.object({
      section: z.string().optional(),
      courseCode: z.string().optional(),
      classId: z.string().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const acadYearCutoff = await getAcadYearCutoff(ctx.db);

    if (input.courseCode && input.section) {
      return findBidResults(
        ctx.db,
        {
          class: { section: input.section, course: { code: input.courseCode } },
        },
        acadYearCutoff,
      );
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

    return findBidResults(
      ctx.db,
      {
        class: {
          section: _class.section,
          course: { code: _class.course.code },
        },
      },
      acadYearCutoff,
    );
  });
