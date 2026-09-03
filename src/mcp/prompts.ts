import type { MCPServer } from "mcp-use";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planSemesterSchema: z.ZodObject<any> = z.object({
  targetTermId: z.string().optional().describe("Academic term id from list-acad-terms; omit to auto-pick the next term"),
  facultyId: z.number().int().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planRoadmapSchema: z.ZodObject<any> = z.object({
  goal: z.string().describe("The user's goal in their own words, e.g. 'graduate on time', 'double major in Finance and Marketing', 'become a data analyst'"),
  roadmapId: z.string().optional().describe("Roadmap id from my-roadmaps; omit to use the active roadmap"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const checkGraduationSchema: z.ZodObject<any> = z.object({
  roadmapId: z.string().optional().describe("Roadmap id from my-roadmaps; omit to check the active roadmap"),
  termId: z.string().optional().describe("Academic term id from list-acad-terms to also check timetable exam clashes; omit to skip the clash check"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planBiddingSchema: z.ZodObject<any> = z.object({
  acadTermId: z.string().optional().describe("Academic term id from list-acad-terms; omit to use the current term"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findCoursesSchema: z.ZodObject<any> = z.object({
  interest: z.string().describe("What the user wants to learn, e.g. 'machine learning', 'easy AUs', 'professors with great reviews'"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reviewTimetableSchema: z.ZodObject<any> = z.object({
  acadTermId: z.string().optional().describe("Academic term id from list-acad-terms; omit to use the current term"),
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
      description: "Plan the user's next semester based on their progression and senior roadmaps. Use this to answer 'what should I take next term'.",
      schema: planSemesterSchema,
    },
    async (args: PromptArgs) => {
      const targetTermId = textArg(args, "targetTermId");
      const facultyId = numArg(args, "facultyId");
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: `Help the user plan their next semester.

1. Call the plan-semester tool${targetTermId ? ` with targetTermId "${targetTermId}"` : ""}${facultyId !== undefined ? ` and facultyId ${String(facultyId)}` : ""} to get the target term, the user's position, and ranked course candidates inspired by seniors in their faculty.
2. For the top 3-5 candidates, optionally fetch details: get-course (exact code), get-classes (sections/timings), get-bid-prediction (bid guidance) if the user wants to bid.
3. Present a concise per-term plan: course code, name, credit units, and a note on why it's recommended (how many seniors took it at that point).
4. Do not invent course codes - only use codes returned by the tools.` },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "plan-roadmap",
      description: "Plan the user's full multi-year roadmap toward a goal (graduate on time, double major, target role like data analyst). Use this for 'plan my entire roadmap', 'I want to be XX', 'can I complete two majors'.",
      schema: planRoadmapSchema,
    },
    async (args: PromptArgs) => {
      const goal = textArg(args, "goal") ?? "graduate on time";
      const roadmapId = textArg(args, "roadmapId");
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: `Help the user plan their full roadmap toward this goal: "${goal}".

1. Get their current position: ${roadmapId ? `call get-my-roadmap with roadmapId "${roadmapId}"` : "call my-roadmaps, then get-my-roadmap on the active roadmap"} to see completed and planned courses.
2. If the goal names a second major, minor, or track, call browse-public-roadmaps to find a senior roadmap in that area and get-public-roadmap on the best match to see the required course sequence.
3. Call check-roadmap-feasibility${roadmapId ? ` with roadmapId "${roadmapId}"` : " on the active roadmap"} to surface missing prerequisites and credit gaps.
4. Present a year-by-year plan (Y1T1 → graduation): per term list course codes + names, flag prerequisites that must come first, and call out anything the goal requires that is not yet on their roadmap.
5. Do not invent course codes - only use codes returned by the tools.` },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "check-graduation",
      description: "Check whether the user is on track to graduate: prerequisites, credit coverage, and timetable exam clashes. Use this for 'will I graduate on time', 'am I missing anything'.",
      schema: checkGraduationSchema,
    },
    async (args: PromptArgs) => {
      const roadmapId = textArg(args, "roadmapId");
      const termId = textArg(args, "termId");
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: `Check whether the user is on track to graduate.

1. Call check-roadmap-feasibility${roadmapId ? ` with roadmapId "${roadmapId}"` : " on the active roadmap"}${termId ? ` and termId "${termId}" to also check timetable exam clashes` : ""} and report every PREREQ_MISSING, credit gap, and exam clash verbatim.
2. For each missing prerequisite, call get-course to confirm it exists and suggest the earliest term it can be slotted into.
3. Summarize: on-track (nothing missing) vs blocked (list each blocker with the fix). Do not invent course codes.` },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "plan-bidding",
      description: "Plan bidding for the term: budget, saved bids, predictions, and suggested amounts. Use this for 'how should I bid', 'will I get this class'.",
      schema: planBiddingSchema,
    },
    async (args: PromptArgs) => {
      const acadTermId = textArg(args, "acadTermId");
      const termClause = acadTermId ? ` for term "${acadTermId}"` : " for the current term";
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: `Help the user plan their bidding${termClause}.

1. Call my-bid-plan${acadTermId ? ` with acadTermId "${acadTermId}"` : ""} for budget balance and saved bids, plus get-bid-windows${acadTermId ? ` with acadTermId "${acadTermId}"` : ""} for open rounds.
2. For each bid target, call get-bid-prediction and recommend-bid-amount (or explore-bid-options for history + safety factors) to ground the suggested amount.
3. Present per class: predicted median/min, suggested bid, vacancy, and whether it fits the remaining budget. Never guarantee a seat - predictions are guidance.` },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "find-courses",
      description: "Find courses by interest, difficulty, or professor quality. Use this for 'easy electives', 'best professors for X', 'courses about machine learning'.",
      schema: findCoursesSchema,
    },
    async (args: PromptArgs) => {
      const interest = textArg(args, "interest") ?? "interesting electives";
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: `Help the user find courses about: "${interest}".

1. Call search-courses with the interest as the query; if it names a professor, call search-professors too.
2. For the top 3-5 hits, call get-course-reviews (and get-professor-reviews for professor picks) plus get-review-summary to ground quality claims.
3. Present each pick with code, name, credit units, and what reviewers actually say. Do not invent course codes or review quotes.` },
          },
        ],
      };
    },
  );

  server.prompt(
    {
      name: "review-timetable",
      description: "Review the user's timetable for the term: classes, exam clashes, and calendar links. Use this for 'is my timetable OK', 'do my exams clash'.",
      schema: reviewTimetableSchema,
    },
    async (args: PromptArgs) => {
      const acadTermId = textArg(args, "acadTermId");
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: `Review the user's timetable${acadTermId ? ` for term "${acadTermId}"` : " for the current term"}.

1. Call my-timetables${acadTermId ? ` with acadTermId "${acadTermId}"` : ""}, then get-my-timetable-detail on the active timetable for sections, timings, and exam schedules.
2. Call check-roadmap-feasibility${acadTermId ? ` with termId "${acadTermId}"` : ""} to surface exam clashes against the timetable.
3. Report clashes first (if any), then a day-by-day summary. Offer get-timetable-calendar-link for a subscribe link only if the user asks.` },
          },
        ],
      };
    },
  );
}