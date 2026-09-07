import { z } from "zod";

export const courseSearchOutput = z.object({
  results: z.array(
    z.object({
      id: z.string().optional(),
      code: z.string(),
      name: z.string(),
      description: z.string().optional(),
      creditUnits: z.number().optional(),
      sections: z
        .array(
          z.object({
            classId: z.string().optional(),
            section: z.string().optional(),
            professorName: z.string().nullable().optional(),
            timings: z
              .array(
                z.object({
                  dayOfWeek: z.string().nullable().optional(),
                  startTime: z.string().optional(),
                  endTime: z.string().optional(),
                  venue: z.string().nullable().optional(),
                }),
              )
              .optional(),
            examTimings: z
              .array(
                z.object({
                  // Must be JSON-Schema-serializable: mcp-use serializes this
                  // outputSchema into tools/list, and z.date() there throws
                  // "Date cannot be represented in JSON Schema" (-32603 for
                  // every client). The runtime always JSON-round-trips Prisma
                  // Date -> ISO string before guardedParse, so string is the
                  // honest type.
                  date: z.string().optional(),
                  startTime: z.string().optional(),
                  endTime: z.string().optional(),
                  venue: z.string().nullable().optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export const bidPlanEntry = z.object({
  id: z.string(),
  bidAmount: z.number(),
  status: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  section: z.string(),
  professorName: z.string().nullable(),
  round: z.string(),
  window: z.number(),
});

export const bidPlanOutput = z.object({
  acadTermId: z.string(),
  budget: z.object({ balance: z.number() }).nullable(),
  bids: z.array(bidPlanEntry),
});

export const roadmapOutput = z.object({
  roadmapId: z.string(),
  name: z.string(),
  isPublic: z.boolean(),
  owner: z.string().nullable(),
  voteCount: z.number().nullable(),
  progress: z.object({ completed: z.number(), total: z.number() }).optional(),
  entries: z.array(
    z.object({
      yearNumber: z.number(),
      term: z.string(),
      courseCode: z.string(),
      courseName: z.string(),
      creditUnits: z.number().nullable(),
    }),
  ),
});

export const reviewCardsOutput = z.object({
  context: z.string(),
  // Restored from the review procedure's { items, nextCursor } page
  // (Task 11): the catalog tool embeds nextCursor in its payload and
  // reviewCardsProps forwards it, so the view can page forward. Optional —
  // absent on bare-array payloads and unset cursors.
  nextCursor: z.string().optional(),
  reviews: z.array(
    z.object({
      id: z.string(),
      body: z.string().nullable(),
      tips: z.string().nullable(),
      rating: z.number().nullable(),
      labels: z.array(z.string()),
      voteCount: z.number(),
      createdAt: z.string(),
      courseCode: z.string().nullable(),
      professorName: z.string().nullable(),
    }),
  ),
});

export const bidExplorerOutput = z.object({
  classId: z.string().nullable(),
  history: z.array(
    z.object({
      acadTermId: z.string(),
      round: z.string(),
      window: z.number(),
      min: z.number(),
      median: z.number(),
      vacancy: z.number().nullable(),
    }),
  ),
  prediction: z
    .object({
      medianPredicted: z.number(),
      minPredicted: z.number().nullable(),
      bidWindow: z.object({
        id: z.number(),
        round: z.string(),
        window: z.number(),
      }),
    })
    .nullable(),
  safetyFactors: z.array(
    z.object({ beatsPercentage: z.number(), multiplier: z.number() }),
  ),
});

export const calendarLinksOutput = z.object({
  timetableId: z.string(),
  madeLinkShareable: z.boolean().optional(),
});

/**
 * get-my-timetable-detail output — mirrors the catalog tool's `toDetail`
 * shape (src/server/mcp/tools/read/timetable-detail.ts): one flat entry per
 * weekly class timing (day/startTime/endTime/venue) plus per-class exam
 * timings. isActive/termId are optional because the tool only emits them when
 * a listMine lookup resolved the timetable's metadata. Exam `date` is a
 * string (never z.date()) — the runtime JSON-round-trips Prisma Date -> ISO
 * string before guardedParse, and z.date() would throw "Date cannot be
 * represented in JSON Schema" in tools/list (see courseSearchOutput above).
 */
export const timetableDetailOutput = z.object({
  timetableId: z.string(),
  name: z.string(),
  isActive: z.boolean().optional(),
  termId: z.string().optional(),
  slots: z.array(
    z.object({
      classId: z.string(),
      courseCode: z.string(),
      courseName: z.string(),
      section: z.string(),
      day: z.string().nullable(),
      startTime: z.string(),
      endTime: z.string(),
      venue: z.string().nullable(),
      professor: z.string().nullable(),
      creditUnits: z.number(),
    }),
  ),
  examTimings: z.array(
    z.object({
      classId: z.string(),
      courseCode: z.string(),
      section: z.string(),
      date: z.string().nullable(),
      dayOfWeek: z.string().nullable(),
      startTime: z.string(),
      endTime: z.string(),
      venue: z.string().nullable(),
    }),
  ),
});

// _meta for calendar-links (View-only URLs) — keep unvalidated, typed separately:
export type CalendarLinksMeta = {
  feedUrl: string;
  subscribeUrl: string;
  googleSubscribeUrl: string;
  appleSubscribeUrl: string;
  outlookSubscribeUrl: string;
};

// Shared zod-inferred payload types for the View components (Task 6). Views
// import these as `import type` — erased at runtime, so Views stay
// dependency-free (no zod in the view bundle).
export type BidPlan = z.infer<typeof bidPlanOutput>;
export type RoadmapViewData = z.infer<typeof roadmapOutput>;
export type ReviewCardsData = z.infer<typeof reviewCardsOutput>;
export type BidExplorerData = z.infer<typeof bidExplorerOutput>;
export type TimetableViewData = z.infer<typeof timetableDetailOutput>;
