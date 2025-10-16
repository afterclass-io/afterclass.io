import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { PUBLIC_CLASS_FIELDS } from "@/server/api/classes/constants";

export const getAll = publicProcedure
  .input(
    z.object({
      id: z.string().optional(),
      professorId: z.string().optional(),
      profSlug: z.string().optional(),
      courseId: z.string().optional(),
      courseCode: z.string().optional(),
      section: z.string().optional(),
      acadTermId: z.string().optional(),

      // Updated day enum to match "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" format
      day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).optional(),
      startsAfter: z.string().optional(), // "12:00"
      endsBefore: z.string().optional(), // "14:30"
      // -------------------

      limit: z.number().default(100),
    }),
  )
  .query(async ({ ctx, input }) => {
    const latestAcadTerm = await ctx.db.acadTerm.findFirst({
      orderBy: {
        startDt: "desc",
      },
    });

    const sessionFilters = [];


    if (input.day) {

      sessionFilters.push({
        dayOfWeek: input.day, 
      });
    }

    if (input.startsAfter) {
      sessionFilters.push({
        startTime: {
          gte: input.startsAfter,
        },
      });
    }

    if (input.endsBefore) {
      sessionFilters.push({
        endTime: {
          lte: input.endsBefore,
        },
      });
    }

    // Combine all session filters into a single AND condition forthe 'some' clause
    const sessionsWhereClause = sessionFilters.length > 0 ? { AND: sessionFilters } : undefined;

    const classes = await ctx.db.classes.findMany({
      select: PUBLIC_CLASS_FIELDS,
      where: {
        id: input.id,
        courseId: input.courseId,
        section: input.section,
        acadTermId: input.acadTermId ?? latestAcadTerm?.id,
        professorId: input.professorId,
        professor: {
          slug: input.profSlug,
        },
        course: {
          code: input.courseCode,
        },
        // --- ensure at least one ClassTiming satisfies the filters ---
        classTimings: sessionsWhereClause ? {
          some: sessionsWhereClause,
        } : undefined,

      },
      orderBy: [
        {
          acadTermId: "desc",
        },
        {
          section: "asc",
        },
      ],
      take: input.limit > 100 ? 100 : input.limit,
    });
    return classes;
  });