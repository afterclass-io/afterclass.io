import { z } from "zod";

export const listPublicInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  facultyId: z.number().int().optional(),
  query: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["newest", "most-liked", "most-viewed"]).default("newest"),
});
