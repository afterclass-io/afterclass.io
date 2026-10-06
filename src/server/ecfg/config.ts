import { z } from "zod";

export const DEFAULT_CHAT_CONFIG = {
  quotaPerMonth: 20,
  nudgeAt: 16,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  maxInputTokens: 64000,
  maxOutputTokens: 4096,
  maxToolRounds: 12,
  // Kill-switches (ecfg-owned only, no env bindings): all default
  // true. chatEnabled gates POST /api/chat (503), widgetEnabled hides the
  // widget client-side via status, mcpEnabled gates the MCP transport only.
  chatEnabled: true,
  widgetEnabled: true,
  mcpEnabled: true,
} as const;

export const chatConfigSchema = z
  .object({
    quotaPerMonth: z.number().int().positive(),
    nudgeAt: z.number().int().min(0),
    rateLimitPerMinute: z.number().int().positive(),
    mcpRateLimitPerMinute: z.number().int().positive(),
    maxInputTokens: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    maxToolRounds: z.number().int().positive(),
    chatEnabled: z.boolean(),
    widgetEnabled: z.boolean(),
    mcpEnabled: z.boolean(),
    // Content moderation tunables. Loosely typed on purpose: range checks
    // live in the canonical strict schema (src/server/config/chat-config.ts)
    // so a bad value fails closed at the moderation call site instead of
    // discarding the whole remote config here.
    moderationReportThreshold: z.number(),
    moderationBackoffMultiplier: z.number(),
    moderationThresholdCap: z.number(),
    moderationJudgementsPerHour: z.number(),
    moderationReportsPerHour: z.number(),
    moderationClaimWindowMinutes: z.number(),
    moderationJudgeTimeoutMs: z.number(),
    moderationLogRetentionDays: z.number(),
    moderationModel: z.string(),
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
  // Gates password (Credentials provider) login. Defaults to false
  // (Google-only auth); flipped on via remote Edge Config when needed.
  enablePasswordLogin: z.boolean().default(false),
  // Master switch for report-driven content moderation. Defaults to false so
  // a remote config without the key still parses (a new required key would
  // fail validation and discard the whole remote config). Remote-only: no
  // env override, so it cannot be bypassed.
  enableContentModeration: z.boolean().default(false),
  // A config whose remote Edge Config hasn't been updated with `chat` yet must
  // still parse. NOTE (zod 4.5+): an inner schema's `.default()` is now applied
  // even when the key is absent/undefined, so `chat` is always populated (with
  // DEFAULT_CHAT_CONFIG when missing). `getChatConfig()` keeps its
  // `?? DEFAULT_CHAT_CONFIG` fallback as defence-in-depth for the raw
  // config.json fallback path.
  chat: chatConfigSchema.optional(),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;
