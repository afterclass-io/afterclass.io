import { z } from "zod";

export const edgeConfigSchema = z.object({
  enableAnnouncementBanner: z.boolean(),
  enableCmdkTooltip: z.boolean(),
  enableReviewEventsTracking: z.boolean(),
  enableReviewSort: z.boolean(),
  enableReviewFilter: z.boolean(),
  enableReviewReactions: z.boolean(),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;

/**
 * Cache tag for the cached edge-config read (see EdgeConfigProvider).
 * `POST /api/revalidate` invalidates this tag on demand.
 */
export const EDGE_CONFIG_CACHE_TAG = "edge-config";
