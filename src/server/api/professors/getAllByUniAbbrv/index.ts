import { type Prisma } from "@/generated/prisma/client";
import { UniversityAbbreviation } from "@/generated/prisma/enums";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByUniAbbrv = publicProcedure
  .input(
    z.object({
      universityAbbrv: z.enum(UniversityAbbreviation),
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
