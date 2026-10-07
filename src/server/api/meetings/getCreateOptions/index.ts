import { protectedProcedure } from "@/server/api/trpc";
import { getCurrentAcadTerm } from "@/common/tools/acad-term";

const MAX_CLASS_OPTIONS = 3000;

export const getCreateOptions = protectedProcedure.query(async ({ ctx }) => {
  const term = await getCurrentAcadTerm(ctx.db);
  if (!term) return { term: null, classes: [] };

  const rows = await ctx.db.classes.findMany({
    where: { acadTermId: term.id },
    distinct: ["courseId", "section"],
    select: {
      section: true,
      course: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ course: { code: "asc" } }, { section: "asc" }],
    take: MAX_CLASS_OPTIONS,
  });

  const unique = new Map(
    rows.map((row) => [
      `${row.course.id}:${row.section}`,
      {
        courseId: row.course.id,
        code: row.course.code,
        name: row.course.name,
        section: row.section,
      },
    ]),
  );

  return { term, classes: [...unique.values()] };
});
