import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";
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
 *
 * Guardrails:
 * - Rejects early when the roadmap already has 100 entries (max capacity).
 * - Clamps yearNumber to 1–8 (buildProgressSyncPlan).
 * - Batches timetable lookups into one findMany (no N+1 per term).
 * - Stops adding once 100 entries would be exceeded.
 * - Catches P2002 (duplicate courseId) from concurrent syncs.
 * - Bumps user_roadmap.updatedAt so Task 5's version check works.
 */
export const syncProgress = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const roadmap = await requireOwnedRoadmap(
      ctx.db,
      input.roadmapId,
      ctx.session.user.id,
      { id: true, isActive: true, matricTermId: true },
    );

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

    // ---- Existing roadmap courses (sync never duplicates courseIds) ----
    const existingEntries = await ctx.db.userRoadmapEntry.findMany({
      where: { roadmapId: roadmap.id },
      select: { courseId: true, sortOrder: true },
    });
    if (existingEntries.length >= 100) {
      return { synced: 0, courseIds: [] as string[] };
    }
    const existingCourseIds = new Set(existingEntries.map((e) => e.courseId));
    let nextSortOrder =
      existingEntries.reduce((max, e) => Math.max(max, e.sortOrder), -1) + 1;

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

    // ---- Batch timetable lookup: one query for all plan terms ----
    const planTermIds = plan.map((t) => t.acadTermId);
    const timetables = await ctx.db.userTimetable.findMany({
      where: {
        userId: ctx.session.user.id,
        acadTermId: { in: planTermIds },
        isActive: true,
      },
      select: {
        acadTermId: true,
        slots: { select: { class: { select: { courseId: true } } } },
      },
    });
    const slotsByTerm = new Map(
      timetables.map((t) => [t.acadTermId, t.slots]),
    );

    // ---- For each plan target, pull courses from the active timetable ----
    const toCreate: {
      roadmapId: string;
      courseId: string;
      yearNumber: number;
      term: string;
      sortOrder: number;
    }[] = [];

    for (const target of plan) {
      // Stop adding once we would exceed 100 total entries.
      if (existingCourseIds.size + toCreate.length >= 100) break;

      const slots = slotsByTerm.get(target.acadTermId);
      if (!slots || slots.length === 0) continue;

      const candidates = slots.map((s) => s.class.courseId);
      const fresh = pickNewCourseIds(existingCourseIds, candidates);
      for (const courseId of fresh) {
        if (existingCourseIds.size + toCreate.length >= 100) break;
        existingCourseIds.add(courseId);
        toCreate.push({
          roadmapId: input.roadmapId,
          courseId,
          yearNumber: target.yearNumber,
          term: target.term,
          sortOrder: nextSortOrder++,
        });
      }
    }

    if (toCreate.length > 0) {
      try {
        await ctx.db.$transaction(async (tx) => {
          await tx.userRoadmapEntry.createMany({ data: toCreate });
          // Bump updatedAt so Task 5's version check works.
          await tx.userRoadmap.update({
            where: { id: roadmap.id },
            data: { updatedAt: new Date() },
          });
        });
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          return { synced: 0, courseIds: [] as string[] };
        }
        throw err;
      }
    }

    return {
      synced: toCreate.length,
      courseIds: toCreate.map((e) => e.courseId),
    };
  });
