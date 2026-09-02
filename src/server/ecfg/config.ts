import { z } from "zod";

export const DEFAULT_CHAT_CONFIG = {
  quotaPerMonth: 50,
  nudgeAt: 40,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  spendCapPerMonthUsd: 20,
  maxInputTokens: 64000,
  maxOutputTokens: 4096,
  maxToolRounds: 12,
  priceInputPerM: 0.14,
  priceCachedInputPerM: 0.014,
  priceOutputPerM: 0.28,
} as const;

export const chatConfigSchema = z
  .object({
    quotaPerMonth: z.number().int().positive(),
    nudgeAt: z.number().int().min(0),
    rateLimitPerMinute: z.number().int().positive(),
    mcpRateLimitPerMinute: z.number().int().positive(),
    spendCapPerMonthUsd: z.number().nonnegative(),
    maxInputTokens: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    maxToolRounds: z.number().int().positive(),
    priceInputPerM: z.number().nonnegative(),
    priceCachedInputPerM: z.number().nonnegative(),
    priceOutputPerM: z.number().nonnegative(),
  })
  .partial()
  .default(DEFAULT_CHAT_CONFIG)
  .transform((cfg) => ({ ...DEFAULT_CHAT_CONFIG, ...cfg }));

export type ChatConfig = z.infer<typeof chatConfigSchema>;

export const edgeConfigSchema = z.object({
  enableAnnouncementBanner: z.boolean(),
  enableCmdkTooltip: z.boolean(),
  enableReviewEventsTracking: z.boolean(),
  enableReviewSort: z.boolean(),
  enableReviewFilter: z.boolean(),
  enableReviewReactions: z.boolean(),
  // A config whose remote Edge Config hasn't been updated with `chat` yet must
  // still parse. NOTE (zod 4.5+): an inner schema's `.default()` is now applied
  // even when the key is absent/undefined, so `chat` is always populated (with
  // DEFAULT_CHAT_CONFIG when missing). `getChatConfig()` keeps its
  // `?? DEFAULT_CHAT_CONFIG` fallback as defence-in-depth for the raw
  // config.json fallback path.
  chat: chatConfigSchema.optional(),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;
