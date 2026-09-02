import { z } from "zod";

export const courseSearchOutput = z.object({
  results: z.array(
    z.object({
      id: z.string().optional(),
      code: z.string(),
      name: z.string(),
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
      bidWindow: z.object({ id: z.number(), round: z.string(), window: z.number() }),
    })
    .nullable(),
  safetyFactors: z.array(z.object({ beatsPercentage: z.number(), multiplier: z.number() })),
});

export const bidRecommendationOutput = z.object({
  classId: z.string(),
  acadTermId: z.string(),
  bidWindow: z.object({ id: z.number(), round: z.string(), window: z.number() }).optional(),
  predictedMedian: z.number(),
  suggestedBidAmount: z.number(),
  multiplierUsed: z.object({ beatsPercentage: z.number(), multiplier: z.number() }).nullable().optional(),
  rationale: z.string().optional(),
});

export const calendarLinksOutput = z.object({
  timetableId: z.string(),
  madeLinkShareable: z.boolean().optional(),
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
export type BidRecommendationData = z.infer<typeof bidRecommendationOutput>;
