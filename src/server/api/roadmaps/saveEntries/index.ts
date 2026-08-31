import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const saveEntries = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      updatedAt: z.iso.datetime().optional(),
      entries: z
        .array(
          z.object({
            courseId: z.string(),
            yearNumber: z.number().int().min(1).max(8),
            term: z.enum(["T1", "T2", "T3A", "T3B"]),
            sortOrder: z.number().int().min(0).max(99),
          }),
        )
        .max(100),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
      select: { id: true, userId: true, updatedAt: true },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    // Optimistic concurrency: refuse to clobber changes made elsewhere
    // (another tab, another device, or a progress-sync that landed after
    // the client's snapshot).
    if (
      input.updatedAt &&
      roadmap.updatedAt.toISOString() !== input.updatedAt
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This roadmap was updated elsewhere. Refresh and try again.",
      });
    }

    // Duplicate validation (defense-in-depth; the DB unique constraint is
    // the backstop).
    const seen = new Set<string>();
    for (const e of input.entries) {
      if (seen.has(e.courseId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Course ${e.courseId} appears more than once`,
        });
      }
      seen.add(e.courseId);
    }

    let updatedAt: Date;
    try {
      updatedAt = await ctx.db.$transaction(async (tx) => {
        await tx.userRoadmapEntry.deleteMany({
          where: { roadmapId: input.roadmapId },
        });
        await tx.userRoadmapEntry.createMany({
          data: input.entries.map((e) => ({
            ...e,
            roadmapId: input.roadmapId,
          })),
        });
        // Bump updatedAt so concurrent editors' version checks fail fast, and
        // return it so the client can keep its version token in sync.
        const updated = await tx.userRoadmap.update({
          where: { id: input.roadmapId },
          data: { updatedAt: new Date() },
          select: { updatedAt: true },
        });
        return updated.updatedAt;
      });
    } catch (err) {
      const prismaCode =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof (err as { code?: unknown }).code === "string"
          ? (err as { code: string }).code
          : undefined;
      if (prismaCode === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Duplicate course detected — refresh and try again.",
        });
      }
      if (prismaCode === "P2003") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown course — refresh and try again.",
        });
      }
      throw err;
    }

    return { count: input.entries.length, updatedAt };
  });
