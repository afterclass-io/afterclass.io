import { type Prisma, UniversityAbbreviation } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByUniAbbrv = publicProcedure
  .input(
    z.object({
      universityAbbrv: z.nativeEnum(UniversityAbbreviation),
    }),
  )
  .query(
    async ({ ctx, input }) =>
      await ctx.db.professors.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        } satisfies Prisma.ProfessorsSelect,
        where: {
          belongToUniversity: {
            abbrv: input.universityAbbrv,
          },
        },
      }),
  );
