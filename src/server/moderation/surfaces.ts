import type { Prisma } from "@/generated/prisma/client";
import { ModerationSurface, Visibility } from "@/generated/prisma/enums";
import { hideRoadmap, hideTimetable } from "@/server/api/sharing/hide";

type Db = Prisma.TransactionClient;

/**
 * A user-authored text surface registered with the moderation core.
 * Registering a new surface = one optional relation (+ unique + index +
 * back-relation) on ModerationReport, one ModerationSurface enum value (a
 * migration), and one entry in MODERATION_SURFACES. Nothing else changes.
 */
export type SurfaceAdapter = {
  surface: ModerationSurface;
  /** Context for the judge. Never includes identity. */
  label: string;
  /** The reportable item behind a client reference, or null when it is gone
   * or not visible to non-owners. */
  resolve(
    db: Db,
    ref: string,
  ): Promise<{ itemId: string; ownerId: string } | null>;
  /** Where clause selecting this item's reports. */
  reportsFor(itemId: string): Prisma.ModerationReportWhereInput;
  /** Row data for one report on this item. */
  reportData(
    reporterId: string,
    itemId: string,
  ): Prisma.ModerationReportCreateManyInput;
  /** The live, labelled text the judge reads, or null when the item is gone. */
  readText(db: Db, itemId: string): Promise<string | null>;
  /** Take the item out of everyone else's view. Idempotent. */
  applyViolation(db: Db, itemId: string): Promise<void>;
};

export const REPORT_SURFACES = ["review", "roadmap", "timetable"] as const;
export type ReportSurface = (typeof REPORT_SURFACES)[number];

export const MODERATION_SURFACES: Record<ReportSurface, SurfaceAdapter> = {
  review: {
    surface: ModerationSurface.REVIEW,
    label: "anonymous course or professor review",
    resolve: async (db, ref) => {
      const row = await db.reviews.findUnique({
        where: { id: ref },
        select: { id: true, reviewerId: true },
      });
      return row && { itemId: row.id, ownerId: row.reviewerId };
    },
    reportsFor: (itemId) => ({ reviewId: itemId }),
    reportData: (reporterId, itemId) => ({ reporterId, reviewId: itemId }),
    readText: async (db, itemId) => {
      const row = await db.reviews.findUnique({
        where: { id: itemId },
        select: { body: true, tips: true },
      });
      if (!row) return null;
      return row.tips
        ? `Review:\n${row.body}\n\nTips:\n${row.tips}`
        : `Review:\n${row.body}`;
    },
    applyViolation: async (db, itemId) => {
      // Cascades to votes, labels, events, reactions and reports. Ratings are
      // computed from live rows, so they recompute on their own.
      await db.reviews.deleteMany({ where: { id: itemId } });
    },
  },
  roadmap: {
    surface: ModerationSurface.ROADMAP,
    label: "degree roadmap title and description",
    resolve: async (db, ref) => {
      const row = await db.userRoadmap.findFirst({
        where: { id: ref, visibility: { not: Visibility.PRIVATE } },
        select: { id: true, userId: true },
      });
      return row && { itemId: row.id, ownerId: row.userId };
    },
    reportsFor: (itemId) => ({ roadmapId: itemId }),
    reportData: (reporterId, itemId) => ({ reporterId, roadmapId: itemId }),
    readText: async (db, itemId) => {
      const row = await db.userRoadmap.findUnique({
        where: { id: itemId },
        select: { name: true, description: true },
      });
      if (!row) return null;
      return row.description
        ? `Title: ${row.name}\nDescription: ${row.description}`
        : `Title: ${row.name}`;
    },
    applyViolation: (db, itemId) => hideRoadmap(db, itemId),
  },
  timetable: {
    surface: ModerationSurface.TIMETABLE,
    label: "shared timetable name",
    resolve: async (db, ref) => {
      // ref is the share token: timetables are link-shared only and the
      // shared view never receives the timetable id.
      const row = await db.userTimetable.findUnique({
        where: { shareToken: ref, visibility: { not: Visibility.PRIVATE } },
        select: { id: true, userId: true },
      });
      return row && { itemId: row.id, ownerId: row.userId };
    },
    reportsFor: (itemId) => ({ timetableId: itemId }),
    reportData: (reporterId, itemId) => ({ reporterId, timetableId: itemId }),
    readText: async (db, itemId) => {
      const row = await db.userTimetable.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      return row ? `Title: ${row.name}` : null;
    },
    applyViolation: (db, itemId) => hideTimetable(db, itemId),
  },
};
