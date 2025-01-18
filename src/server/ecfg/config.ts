import { z } from "zod";

export const edgeConfigSchema = z.object({
  enableAnnouncementBanner: z.boolean(),
  enableCmdkTooltip: z.boolean(),
  enableReviewEventsTracking: z.boolean(),
  enableReviewSort: z.boolean(),
  enableReviewFilter: z.boolean(),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;
