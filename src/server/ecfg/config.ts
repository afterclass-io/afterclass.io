import { z } from "zod";

export const DEFAULT_CHAT_CONFIG = {
  quotaPerMonth: 50,
  nudgeAt: 40,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  spendCapPerMonthUsd: 20,
  maxInputTokens: 16000,
  maxOutputTokens: 1024,
  maxToolRounds: 6,
  maxMessages: 12,
  priceInputPerM: 0.14,   // DeepSeek V4 Flash cache-miss (conservative)
  priceCachedInputPerM: 0.014, // 10x cheaper cache-hit
  priceOutputPerM: 0.28,
  provider: "deepseek-v4-flash",
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
    maxMessages: z.number().int().positive(),
    priceInputPerM: z.number().nonnegative(),
    priceCachedInputPerM: z.number().nonnegative(),
    priceOutputPerM: z.number().nonnegative(),
    provider: z.string(),
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
  // Optional so configs whose remote Edge Config hasn't been updated with `chat`
  // yet still parse; getChatConfig() falls back to DEFAULT_CHAT_CONFIG then.
  chat: chatConfigSchema.optional(),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;
