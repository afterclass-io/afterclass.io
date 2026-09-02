import type { MCPServer } from "mcp-use";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const planSemesterSchema: z.ZodObject<any> = z.object({
  targetTermId: z.string().optional().describe("Academic term id from list-acad-terms; omit to auto-pick the next term"),
  facultyId: z.number().int().optional(),
});

export function registerPrompts(server: MCPServer): void {
  server.prompt(
    {
      name: "plan-semester",
      description: "Plan the user's next semester based on their progression and senior roadmaps. Use this to answer 'what should I take next term'.",
      schema: planSemesterSchema,
    },
    async ({ targetTermId, facultyId }: { targetTermId?: string; facultyId?: number }) => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: `Help the user plan their next semester.

1. Call the plan-semester tool${targetTermId ? ` with targetTermId "${String(targetTermId)}"` : ""}${facultyId !== undefined ? ` and facultyId ${String(facultyId)}` : ""} to get the target term, the user's position, and ranked course candidates inspired by seniors in their faculty.
2. For the top 3-5 candidates, optionally fetch details: get-course (exact code), get-classes (sections/timings), get-bid-prediction (bid guidance) if the user wants to bid.
3. Present a concise per-term plan: course code, name, credit units, and a note on why it's recommended (how many seniors took it at that point).
4. Do not invent course codes - only use codes returned by the tools.` },
        },
      ],
    }),
  );
}