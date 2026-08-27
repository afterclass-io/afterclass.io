import { z } from "zod";

export const planSemesterInput = z.object({
  /** Optional: default = the next acad term after the current one. */
  targetTermId: z.string().optional(),
  /** Optional: default = the user's faculty. */
  facultyId: z.number().int().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});
