import { publicProcedure } from "@/server/api/trpc";

export const list = publicProcedure.query(async ({ ctx }) => {
  return ctx.db.faculties.findMany({
    select: {
      id: true,
      name: true,
      acronym: true,
    },
    orderBy: { name: "asc" },
  });
});
