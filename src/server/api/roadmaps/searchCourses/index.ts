import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const searchCourses = publicProcedure
  .input(z.object({ query: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const courses = await ctx.db.courses.findMany({
      where: {
        OR: [
          { code: { contains: input.query, mode: "insensitive" } },
          { name: { contains: input.query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        creditUnits: true,
      },
      take: 20,
    });

    return courses;
  });
