import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { getCurrentWindowLogic } from "@/server/api/bidWindows/getCurrentWindow/helpers";
import { getCurrentAcadTerm } from "@/common/tools/acad-term";
import {
  buildProgressSyncPlan,
  pickNewCourseIds,
} from "@/modules/roadmaps/functions/progress-sync";

/**
 * Matriculation-based progress sync for the user's ACTIVE roadmap.
 *
 * For every acad term from the declared matriculation term up to the
 * current term (current bid window's term, else current calendar term),
 * courses from the user's active timetable for that term are added to the
 * corresponding roadmap year/term.
 *
 * Sync is ADD-ONLY: manual entries are never deleted or moved, and courses
 * already on the roadmap (anywhere) are never duplicated.
 */
export const syncProgress = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    if (!roadmap.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only the active roadmap can sync progress",
      });
    }
    if (!roadmap.matricTermId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Declare a matriculation term before syncing progress",
      });
    }

    // ---- Resolve the current term: bid window first, calendar fallback ----
    const currentWindow = await getCurrentWindowLogic(ctx.db);
    const currentTermId =
      currentWindow?.acadTermId ??
      (await getCurrentAcadTerm(ctx.db))?.id ??
      null;
    if (!currentTermId) {
      return { synced: 0, courseIds: [] as string[] };
    }

    // ---- Build the acad-term → roadmap-term sync plan ----
    const termRows = await ctx.db.acadTerm.findMany({
      select: { id: true, acadYearStart: true, term: true, startDt: true },
    });
    const plan = buildProgressSyncPlan(
      termRows,
      roadmap.matricTermId,
      currentTermId,
    );
    if (plan.length === 0) {
      return { synced: 0, courseIds: [] as string[] };
    }

    // ---- Existing roadmap courses (sync never duplicates courseIds) ----
    const existingEntries = await ctx.db.userRoadmapEntry.findMany({
      where: { roadmapId: roadmap.id },
      select: { courseId: true, sortOrder: true },
    });
    const existingCourseIds = new Set(existingEntries.map((e) => e.courseId));
    let nextSortOrder =
      existingEntries.reduce((max, e) => Math.max(max, e.sortOrder), -1) + 1;

    // ---- For each plan target, pull the active timetable's courses ----
    const toCreate: {
      roadmapId: string;
      courseId: string;
      yearNumber: number;
      term: string;
      sortOrder: number;
    }[] = [];

    for (const target of plan) {
      // UserTimetable.isActive marks the user's one active plan per term.
      const timetable = await ctx.db.userTimetable.findFirst({
        where: {
          userId: ctx.session.user.id,
          acadTermId: target.acadTermId,
          isActive: true,
        },
        include: {
          slots: { select: { class: { select: { courseId: true } } } },
        },
      });
      if (!timetable) continue;

      const candidates = timetable.slots.map((s) => s.class.courseId);
      const fresh = pickNewCourseIds(existingCourseIds, candidates);
      for (const courseId of fresh) {
        existingCourseIds.add(courseId);
        toCreate.push({
          roadmapId: roadmap.id,
          courseId,
          yearNumber: target.yearNumber,
          term: target.term,
          sortOrder: nextSortOrder++,
        });
      }
    }

    if (toCreate.length > 0) {
      await ctx.db.userRoadmapEntry.createMany({ data: toCreate });
    }

    return {
      synced: toCreate.length,
      courseIds: toCreate.map((e) => e.courseId),
    };
  });
