import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";

export const getProfessorsByClassId = publicProcedure // Renamed for clarity
  .input(
    z.object({
      classId: z.string(), // Requires the ID of the class
    }),
  )
  .query(async ({ ctx, input }) => {
    // 1. Fetch the professors linked to the given classId
    const professors = await ctx.db.professors.findMany({
      // Select BOTH the name and the slug
      select: {
        name: true,
        slug: true,
      },
      where: {
        classes: {
          some: {
            id: input.classId, // Filter for classes whose ID matches the input
          },
        },
      },
    });

    // 2. Return the array of objects containing name and slug
    return professors;
  });