import { z } from "zod";

export const edgeConfigSchema = z.object({
  enableAnnouncementBanner: z.boolean(),
  enableCmdkTooltip: z.boolean(),
  enableReviewEventsTracking: z.boolean(),
  enableReviewSort: z.boolean(),
  enableReviewFilter: z.boolean(),
  enableReviewReactions: z.boolean(),
  viewHackSubmission: z.object({
    enabled: z.boolean(),
    allowedUsers: z.string().array(),
  }),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;
