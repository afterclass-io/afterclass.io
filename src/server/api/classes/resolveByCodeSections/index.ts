import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { getCurrentWindowLogic } from "@/server/api/bidWindows/getCurrentWindow/helpers";

export const resolveByCodeSections = publicProcedure
  .input(
    z.object({
      items: z
        .array(
          z.object({
            courseCode: z.string().min(1).max(50),
            section: z.string().min(1).max(20),
          }),
        )
        .min(1)
        .max(20),
      acadTermId: z.string().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    let termId = input.acadTermId;
    if (!termId) {
      const currentWindow = await getCurrentWindowLogic(ctx.db);
      termId = currentWindow?.acadTermId;
    }

    const rows = await ctx.db.classes.findMany({
      where: {
        acadTermId: termId,
        OR: input.items.map((i) => ({
          section: i.section,
          course: { code: i.courseCode },
        })),
      },
      select: {
        id: true,
        section: true,
        course: { select: { code: true } },
      },
      orderBy: [{ acadTermId: "desc" }, { section: "asc" }, { id: "asc" }],
    });

    return input.items.map((item) => {
      const match = rows.find(
        (r) => r.course.code === item.courseCode && r.section === item.section,
      );
      return {
        courseCode: item.courseCode,
        section: item.section,
        classId: match ? match.id : null,
      };
    });
  });
