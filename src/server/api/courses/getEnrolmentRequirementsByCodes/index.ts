import { z } from "zod";
import { dataProcedure } from "@/server/api/trpc";

export const getEnrolmentRequirementsByCodes = dataProcedure("courses")
  .input(
    z.object({
      codes: z.array(z.string().min(1)).min(1).max(100),
    }),
  )
  .query(async ({ ctx, input }) => {
    return ctx.db.courses.findMany({
      where: { code: { in: input.codes } },
      select: { code: true, enrolmentRequirements: true },
    });
  });
