import { publicProcedure } from "@/server/api/trpc";

export const getAll = publicProcedure.query(async ({ ctx }) => {
  return await ctx.db.hackSubmission.findMany({
    select: {
      id: true,
      teamName: true,
      slideEmbedUrl: true,
      submissionUrl: true,
    },
  });
});
