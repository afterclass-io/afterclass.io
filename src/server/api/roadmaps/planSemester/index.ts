import { Visibility } from "@prisma/client";

import { protectedProcedure } from "@/server/api/trpc";
import { getCurrentWindowLogic } from "@/server/api/bidWindows/getCurrentWindow/helpers";
import { getCurrentAcadTerm } from "@/common/tools/acad-term";
import { buildProgressSyncPlan, type SyncTermRow } from "@/modules/roadmaps/functions/progress-sync";
import {
  aggregateCandidates,
  computeSeniorTargets,
  type PlanSenior,
} from "@/modules/roadmaps/functions/plan-semester";

import { planSemesterInput } from "./input";

/**
 * Compound "what should I take next term" query.
 *
 * Resolves the target acad term (explicit, else the next term after the
 * current bid window's term), the user's (yearNumber, term) position at that
 * term (from their active roadmap's matriculation term), and ranked candidate
 * courses that public seniors in the same faculty took at the same point in
 * their own progression (frequency + upvotes). One deterministic call instead
 * of 10-20 model-chained tool calls.
 *
 * `targetTermId` / `currentTermId` / `matricTermId` all use the same
 * `AcadTerm.id` string space that `list-acad-terms` returns, so an agent can
 * pass a term id straight through.
 */
export const planSemester = protectedProcedure
  .input(planSemesterInput)
  .query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // ---- 1. Resolve the target term: explicit > next after current ----
    const termRows: SyncTermRow[] = await ctx.db.acadTerm.findMany({
      select: { id: true, acadYearStart: true, term: true, startDt: true },
    });
    const currentWindow = await getCurrentWindowLogic(ctx.db);
    const currentTermId =
      currentWindow?.acadTermId ??
      (await getCurrentAcadTerm(ctx.db))?.id ??
      null;

    let targetTermId: string | null = input.targetTermId ?? null;
    if (!targetTermId) {
      const sorted = [...termRows].sort(
        (a, b) => a.startDt.getTime() - b.startDt.getTime(),
      );
      const idx = sorted.findIndex((t) => t.id === currentTermId);
      targetTermId = sorted[idx + 1]?.id ?? currentTermId ?? null;
    }
    const targetTerm = termRows.find((t) => t.id === targetTermId) ?? null;
    if (!targetTerm || !targetTermId) {
      return { targetTerm: null, userPosition: null, candidates: [], totalSeniors: 0 };
    }

    // ---- 2. User's active roadmap -> userPosition at the target term ----
    const mine = await ctx.db.userRoadmap.findFirst({
      where: { userId, isActive: true },
      select: { id: true, matricTermId: true },
    });
    let userPosition: { yearNumber: number; term: string } | null = null;
    if (mine?.matricTermId) {
      const plan = buildProgressSyncPlan(termRows, mine.matricTermId, targetTermId);
      const last = plan.at(-1);
      userPosition = last ? { yearNumber: last.yearNumber, term: last.term } : null;
    }

    // ---- 3. Candidate seniors: published public roadmaps, faculty filter ----
    const me = await ctx.db.users.findUnique({
      where: { id: userId },
      select: { facultyId: true },
    });
    const facultyId = input.facultyId ?? me?.facultyId ?? null;

    const seniorRoadmaps = await ctx.db.userRoadmap.findMany({
      where: {
        visibility: Visibility.PUBLIC,
        publishedAt: { not: null },
        ...(facultyId !== null ? { facultyId } : {}),
      },
      select: {
        id: true,
        name: true,
        matricTermId: true,
        facultyId: true,
        user: { select: { username: true } },
        // only upvotes (weight = 1) count - same convention as listPublic
        _count: { select: { votes: { where: { weight: 1 } } } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50, // cap; ranking happens in aggregation
    });

    const seniors: PlanSenior[] = seniorRoadmaps.map((r) => ({
      id: r.id,
      name: r.name,
      ownerUsername: r.user.username,
      matricTermId: r.matricTermId,
      facultyId: r.facultyId,
      voteCount: r._count.votes,
    }));

    // ---- 4. Per-senior target at the SAME calendar term, then ONE batched
    //         entries query (the n+1 collapse - no per-roadmap round trips) ----
    const targetByRoadmap = computeSeniorTargets(seniors, termRows, targetTermId);
    const pairs = [...targetByRoadmap.entries()]
      .filter(([, t]) => t !== null)
      .map(([roadmapId, t]) => ({
        roadmapId,
        ...(t as { yearNumber: number; term: string }),
      }));

    const entries = pairs.length
      ? await ctx.db.userRoadmapEntry.findMany({
          where: {
            OR: pairs.map((p) => ({
              roadmapId: p.roadmapId,
              yearNumber: p.yearNumber,
              term: p.term,
            })),
          },
          select: {
            roadmapId: true,
            yearNumber: true,
            term: true,
            course: {
              select: { id: true, code: true, name: true, creditUnits: true },
            },
            roadmap: {
              select: { name: true, user: { select: { username: true } } },
            },
          },
        })
      : [];

    // ---- 5. Exclude courses the user has already taken (active roadmap) ----
    const existing = mine
      ? new Set(
          (
            await ctx.db.userRoadmapEntry.findMany({
              where: { roadmapId: mine.id },
              select: { courseId: true },
            })
          ).map((e) => e.courseId),
        )
      : new Set<string>();

    const seniorVotes = new Map(seniors.map((s) => [s.id, s.voteCount]));

    return {
      targetTerm: {
        id: targetTerm.id,
        acadYearStart: targetTerm.acadYearStart,
        term: targetTerm.term,
      },
      userPosition,
      candidates: aggregateCandidates(
        entries.map((e) => ({
          roadmapId: e.roadmapId,
          courseId: e.course.id,
          courseCode: e.course.code,
          courseName: e.course.name,
          creditUnits: e.course.creditUnits,
          roadmapName: e.roadmap.name,
          ownerUsername: e.roadmap.user.username,
        })),
        targetByRoadmap,
        seniorVotes,
        existing,
        input.limit,
      ),
      totalSeniors: seniors.length,
    };
  });
