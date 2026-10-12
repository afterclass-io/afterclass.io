import { z } from "zod";

export const meetingPollSlug = z
  .string()
  .min(6)
  .max(20)
  .describe("The meeting poll slug (from /meetings/[slug])");

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/);
