import type { MCPServer } from "mcp-use";
import { z } from "zod";

// NOTE: the "Do not invent course codes - only use codes returned by the
// tools" grounding lines in the prompt templates below mirror the never-invent
// invariant in `src/server/assistant/rules.ts` (ASSISTANT_RULES) by
// duplication: importing it here would change the model-visible template bytes
// (provider cache prefix), so keep the line in sync manually and let the
// verbatim tests pin both sides.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planSemesterSchema: z.ZodObject<any> = z.object({
  targetTermId: z
    .string()
    .optional()
    .describe(
      "Academic term id from list-acad-terms; omit to auto-pick the next term",
    ),
  facultyId: z
    .union([z.number().int(), z.string()])
    .optional()
    .describe(
      "Faculty id or acronym (e.g. 4 or SCIS; obtain via list-faculties); omit to use the user's faculty",
    ),
  goal: z
    .string()
    .optional()
    .describe(
      "The user's goal in their own words, e.g. 'data engineering'; forwarded to plan-semester so it can fall back to catalog search when senior candidates are empty",
    ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planRoadmapSchema: z.ZodObject<any> = z.object({
  goal: z
    .string()
    .describe(
      "The user's goal in their own words, e.g. 'graduate on time', 'double major in Finance and Marketing', 'become a data analyst'",
    ),
  roadmapId: z
    .string()
    .optional()
    .describe("Roadmap id from my-roadmaps; omit to use the active roadmap"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planBiddingSchema: z.ZodObject<any> = z.object({
  acadTermId: z
    .string()
    .optional()
    .describe(
      "Academic term id from list-acad-terms; omit to use the current term",
    ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findCoursesSchema: z.ZodObject<any> = z.object({
  interest: z
    .string()
    .describe(
      "What the user wants to learn, e.g. 'machine learning', 'easy AUs', 'professors with great reviews'",
    ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reviewTimetableSchema: z.ZodObject<any> = z.object({
  acadTermId: z
    .string()
    .optional()
    .describe(
      "Academic term id from list-acad-terms; omit to use the current term",
    ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planTermSchema: z.ZodObject<any> = z.object({
  goal: z
    .string()
    .describe(
      "The user's goal in their own words, e.g. 'data engineering'; the term they want to plan toward",
    ),
  acadTermId: z
    .string()
    .optional()
    .describe(
      "Academic term id from list-acad-terms; omit to use the current term",
    ),
  facultyId: z
    .union([z.number().int(), z.string()])
    .optional()
    .describe(
      "Faculty id or acronym (e.g. 4 or SCIS; obtain via list-faculties); omit to use the user's faculty",
    ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findMeetingTimeSchema: z.ZodObject<any> = z.object({
  slug: z
    .string()
    .optional()
    .describe(
      "Meeting poll slug (from the poll url or get-my-meetings); omit to pick from the user's polls",
    ),
  when: z
    .string()
    .optional()
    .describe(
      "The window the user cares about in their own words, e.g. 'Monday morning', 'this weekend', 'evenings next week'",
    ),
});

type PromptArgs = Record<string, unknown>;

function textArg(args: PromptArgs, key: string): string | undefined {
  const v: unknown = args[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function numArg(args: PromptArgs, key: string): number | undefined {
  const v: unknown = args[key];
  return typeof v === "number" ? v : undefined;
}

export function registerPrompts(server: MCPServer): void {
  server.prompt(
    {
      name: "plan-semester",
      description:
        "Plan the user's next semester based on their progression and senior roadmaps. Use this to answer 'what should I take next term'.",
      schema: planSemesterSchema,
    },
    async (args: PromptArgs) => {
      const targetTermId = textArg(args, "targetTermId");
      const facultyStr = textArg(args, "facultyId");
      const facultyNum =
        facultyStr === undefined ? numArg(args, "facultyId") : undefined;
      const goal = textArg(args, "goal");
      // Numbers render bare (facultyId 42); acronym strings render quoted
      // (facultyId "SCIS").
      const facultyClause =
        facultyStr !== undefined
          ? ` with facultyId "${facultyStr}"`
          : facultyNum !== undefined
            ? ` with facultyId ${String(facultyNum)}`
            : "";
      const goalClause = goal !== undefined ? ` with goal "${goal}"` : "";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Help the user plan their next semester.

1. Call the plan-semester tool${targetTermId ? ` with targetTermId "${targetTermId}"` : ""}${facultyClause}${goalClause} to get the target term, the user's position, and ranked course candidates inspired by seniors in their faculty. facultyId accepts a numeric id or an acronym (e.g. SCIS); call list-faculties once, cache id, and reuse it for every later call.
2. If the result carries reason "fallback-catalog", the candidates come from catalog search on the goal (not seniors): present each with its offeredIn terms ("offered in T1, biddable now" vs "runs in T2, plan ahead"), then offer to widen (other terms / wider faculties?).
3. For the top 3-5 candidates, optionally fetch details: get-course (exact code), get-classes (sections/timings), get-bid-prediction (bid guidance) if the user wants to bid.
4. Present a concise per-term plan: course code, name, credit units, and a note on why it's recommended (how many seniors took it at that point, or offeredIn terms for fallback-catalog results). Include the /course/<CODE> page link per candidate from the search summary.
5. Do not invent course codes - only use codes returned by the tools. Order: same-faculty senior candidates first; if empty and a goal is given, the tool already fell back to catalog search (reason fallback-catalog) — present offeredIn terms. If both are empty, say so; never invent codes. When the user gives an intake year (e.g. 2023), resolve it to a matric term via list-acad-terms (the user's Y1T1) and set-matric-term before planning; default faculty from the get-me profile instead of asking.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "plan-roadmap",
      description:
        "Plan the user's full multi-year roadmap toward a goal (graduate on time, double major, target role like data analyst). Use this for 'plan my entire roadmap', 'I want to be XX', 'can I complete two majors'.",
      schema: planRoadmapSchema,
    },
    async (args: PromptArgs) => {
      const goal = textArg(args, "goal") ?? "graduate on time";
      const roadmapId = textArg(args, "roadmapId");
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Help the user plan their full roadmap toward this goal: "${goal}".

1. Get their current position: ${roadmapId ? `call get-my-roadmap with roadmapId "${roadmapId}"` : "call my-roadmaps, then get-my-roadmap on the active roadmap"} to see completed and planned courses.
2. If the goal names a second major, minor, or track, call browse-public-roadmaps to find a senior roadmap in that area and get-public-roadmap on the best match to see the required course sequence.
3. Call check-roadmap-feasibility${roadmapId ? ` with roadmapId "${roadmapId}"` : " on the active roadmap"} to surface missing prerequisites and credit gaps.
4. Present a year-by-year plan (Y1T1 → graduation): per term list course codes + names, flag prerequisites that must come first, and call out anything the goal requires that is not yet on their roadmap.
5. Do not invent course codes - only use codes returned by the tools. Treat public roadmaps as hints, not truth: verify every suggested course exists (get-course) and fits (check-roadmap-feasibility) before presenting.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "plan-bidding",
      description:
        "Plan bidding for the term: budget, saved bids, predictions, and suggested amounts. Use this for 'how should I bid', 'will I get this class'.",
      schema: planBiddingSchema,
    },
    async (args: PromptArgs) => {
      const acadTermId = textArg(args, "acadTermId");
      const termClause = acadTermId
        ? ` for term "${acadTermId}"`
        : " for the current term";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Help the user plan their bidding${termClause}.

1. Call my-bid-plan${acadTermId ? ` with acadTermId "${acadTermId}"` : ""} for budget balance and saved bids, plus get-bid-windows${acadTermId ? ` with acadTermId "${acadTermId}"` : ""} for open rounds.
2. If my-bid-plan returns budget null (no budget set), STOP and offer to set one first via set-bid-budget (balance 0-10000) before suggesting any amounts. Do not suggest bid amounts until the user sets or declines a budget.
3. For each bid target, call explore-bid-options (interactive bid-explorer history + safety factors; pass courseCode+section for section questions) or bid-estimate (text answer / multi-section comparison) to ground the suggested amount. recommend-bid-amount is a fallback for a single number only. Anything related to bid predictions uses the bid explorer: when a bid tool returns a bid-explorer link ('Open in bid analytics: ...'), render it as a markdown link with a short label ('Open in bid explorer').
4. Present per class: predicted median/min, suggested bid, vacancy, and whether it fits the remaining budget (skip the fit check when there is no budget). Never guarantee a seat - predictions are guidance.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "find-courses",
      description:
        "Find courses by interest, difficulty, or professor quality. Use this for 'easy electives', 'best professors for X', 'courses about machine learning'.",
      schema: findCoursesSchema,
    },
    async (args: PromptArgs) => {
      const interest = textArg(args, "interest") ?? "interesting electives";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Help the user find courses about: "${interest}".

1. Call search-courses with the interest as the query; if it names a professor, call search-professors too. To narrow to one school, call list-faculties to resolve the school name to its acronym/id, then pass it as search-courses facultyId (numeric id or acronym, e.g. SCIS).
2. For the top 3-5 hits, call get-course-reviews directly with query (it resolves fuzzy names internally; do NOT call search-courses first for review questions) (and get-professor-reviews for professor picks) plus get-review-summary to ground quality claims.
3. Present each pick with code, name, credit units, and what reviewers actually say, plus its page link (/course/<CODE> from the search summary, /professor/<slug> for professor picks) — link to the page, don't paste the full review text. Do not invent course codes or review quotes. Map common names to codes via search first (e.g. Statistics → COR-STAT1202) instead of asking the user for an exact code.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "review-timetable",
      description:
        "Review the user's timetable for the term: classes, exam clashes, and calendar links. Use this for 'is my timetable OK', 'do my exams clash'.",
      schema: reviewTimetableSchema,
    },
    async (args: PromptArgs) => {
      const acadTermId = textArg(args, "acadTermId");
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Review the user's timetable${acadTermId ? ` for term "${acadTermId}"` : " for the current term"}.

1. Call my-timetables${acadTermId ? ` with acadTermId "${acadTermId}"` : ""}, then get-my-timetable-detail on the active timetable for sections, timings, and exam schedules.
2. Call check-roadmap-feasibility${acadTermId ? ` with termId "${acadTermId}"` : ""} to surface exam clashes against the timetable.
3. Report clashes first (if any), then a day-by-day summary. Include the 'Open timetable: /timetable' link; offer get-timetable-calendar-link for a subscribe link only if the user asks.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "plan-term",
      description:
        "Plan the user's whole term end to end: discover courses, vet with reviews, bid with a budget, save bids, then timetable and roadmap check. Use this for 'plan my term', 'help me plan T1'.",
      schema: planTermSchema,
    },
    async (args: PromptArgs) => {
      const goal = textArg(args, "goal") ?? "this term";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Help the user plan their term toward this goal: "${goal}".

1. Discover: call search-courses on the goal (use list-faculties to scope to one school when asked). Present top hits with code, name, and description.
2. Vet: for the top 3-5 hits call get-course-reviews directly with query (it resolves fuzzy names internally; do NOT call search-courses first for review questions) (and get-professor-reviews for professor picks). Present what reviewers actually say. Resolve exact codes first (get-course) — never present search results as the review answer.
3. Bid: for the shortlist call explore-bid-options (interactive bid explorer: courseCode+section) or bid-estimate for comparison. Call my-bid-plan for budget balance and saved bids — if budget is null, offer set-bid-budget before suggesting amounts. Anything related to bid predictions uses the bid explorer: when a bid tool returns a bid-explorer link ('Open in bid analytics: ...'), render it as a markdown link with a short label ('Open in bid explorer').
4. Commit: save with upsert-bid (single) or save-bids (bulk, confirm:true). After the write the result already contains the full updated bid plan — summarize it, do not re-fetch.
5. Timetable + calendar: offer get-my-timetable-detail to check the weekly arrangement, then get-timetable-calendar-link for a subscribe link only if the user asks.
6. Roadmap check: offer get-my-roadmap on the active roadmap to show where the term fits.
Do not invent course codes - only use codes returned by the tools. Never guarantee a seat - predictions are guidance.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "find-meeting-time",
      description:
        "Find the best time for a group meeting from its availability poll. Use this for 'when should we meet', 'best time on Monday', 'what works this weekend'.",
      schema: findMeetingTimeSchema,
    },
    async (args: PromptArgs) => {
      const slug = textArg(args, "slug");
      const when = textArg(args, "when");
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Help the user find the best time for a group meeting${when ? ` (they care about: "${when}")` : ""}.

1. ${slug ? `Use the poll with slug "${slug}"` : "Call get-my-meetings and pick the poll the user means (ask only if several fit)"}. Each poll carries a url; keep it.
2. Call suggest-meeting-times${slug ? ` with slug "${slug}"` : " with that slug"}. Translate the window into its filters: dates or from/to for days, daysOfWeek for weekdays/weekends (weekend = ["sat","sun"]), earliestStart/latestEnd for parts of the day (evenings = "18:00"-"22:00"). Omit durationMinutes unless the user stated a meeting length; polls do not define one, so never assume it.
3. Present the options best first. Quote each option's summary: tier "everyone-free" means everybody is free; "everyone-attendable" means everybody can attend but some are only "if needed". People who are "if needed" are NOT available - never call them available. Name who is unavailable for partial options. Do not rebuild per-time tables by hand; call suggest-meeting-times again with a narrower window instead.
4. Link the poll with the url the tools returned, as a markdown link with a short label ('Open meeting poll'). Never invent poll pages or URLs (there is no /rsvp). Offer submit-meeting-availability only if the user wants to fill in or change their own availability.`,
            },
          },
        ],
      };
    },
  );
}
