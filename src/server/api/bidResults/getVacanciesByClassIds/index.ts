import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { getAcadYearCutoff } from "@/server/api/bidResults/acad-year-window";

export const getVacanciesByClassIds = publicProcedure
  .input(
    z.object({
      classIds: z.array(z.string().min(1)).min(1).max(100),
      bidWindowId: z.number().int().positive(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const acadYearCutoff = await getAcadYearCutoff(ctx.db);

    const classes = await ctx.db.classes.findMany({
      where: { id: { in: input.classIds } },
      select: { id: true, courseId: true, section: true },
    });

    if (classes.length === 0) {
      return [];
    }

    const seenPairs = new Set<string>();
    const distinctPairs: Array<{ courseId: string; section: string }> = [];
    for (const cls of classes) {
      const key = `${cls.courseId}:${cls.section}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        distinctPairs.push({ courseId: cls.courseId, section: cls.section });
      }
    }

    const results = await ctx.db.bidResult.findMany({
      where: {
        bidWindowId: input.bidWindowId,
        bidWindow: {
          acadTerm: { acadYearStart: { gte: acadYearCutoff } },
        },
        class: {
          OR: distinctPairs.map(({ courseId, section }) => ({
            courseId,
            section,
          })),
        },
      },
      select: {
        vacancy: true,
        class: {
          select: { id: true, courseId: true, section: true },
        },
      },
      orderBy: { classId: "asc" },
    });

    const resultMap = new Map<string, number>();
    for (const r of results) {
      const key = `${r.class.courseId}:${r.class.section}`;
      if (!resultMap.has(key)) {
        resultMap.set(key, r.vacancy);
      }
    }

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const vacancies: Array<{ classId: string; vacancy: number }> = [];

    for (const classId of input.classIds) {
      const cls = classMap.get(classId);
      if (!cls) continue;
      const key = `${cls.courseId}:${cls.section}`;
      const vacancy = resultMap.get(key);
      if (vacancy !== undefined) {
        vacancies.push({ classId, vacancy });
      }
    }

    return vacancies;
  });
