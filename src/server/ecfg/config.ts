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

// Every canonical tunable (src/server/config/chat-config.ts) is declared so
// zod does not strip a remote override before getChatConfigAsync() reads it.
// Loosely typed on purpose: range checks live in the canonical strict schema
// so a bad value fails closed at the call site instead of discarding the
// whole remote `chat` section here. Do NOT use `.passthrough()`.
// `chat-config.remote-tunables.test.ts` fails when the two key sets drift.
export const chatTunablesSchema = z
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
    writeRateLimitPerMinute: z.number(),
    rateLimitWindowMinutes: z.number(),
    settlementSpikeTokens: z.number(),
    maxToolResultChars: z.number(),
    minBid: z.number(),
    maxBidBudget: z.number(),
    defaultBeatsPct: z.number(),
    maxBidAmount: z.number(),
    appTimezone: z.string(),
    icalThrottlePerMinute: z.number(),
    inFlightStaleMs: z.number(),
    rateLimitRetentionWindows: z.number(),
    llmBaseUrl: z.string(),
    llmModel: z.string(),
    chatMaxDurationSec: z.number(),
    moderationReportThreshold: z.number(),
    moderationBackoffMultiplier: z.number(),
    moderationThresholdCap: z.number(),
    moderationJudgementsPerHour: z.number(),
    moderationReportsPerHour: z.number(),
    moderationClaimWindowMinutes: z.number(),
    moderationJudgeTimeoutMs: z.number(),
    moderationLogRetentionDays: z.number(),
  })
  .partial();

export const chatConfigSchema = chatTunablesSchema
  .default(DEFAULT_CHAT_CONFIG)
  .transform((cfg) => ({ ...DEFAULT_CHAT_CONFIG, ...cfg }));

export const DEFAULT_PUBLIC_DATA = {
  classData: false,
  reviews: false,
  courses: false,
  professors: false,
  publicRoadmaps: false,
} as const;

export type PublicDataDomain = keyof typeof DEFAULT_PUBLIC_DATA;

// Partial remote object merged over the private defaults, so a missing key or
// a missing section still parses and stays private.
export const publicDataSchema = z
  .object({
    classData: z.boolean(),
    reviews: z.boolean(),
    courses: z.boolean(),
    professors: z.boolean(),
    publicRoadmaps: z.boolean(),
  })
  .partial()
  .default(DEFAULT_PUBLIC_DATA)
  .transform((cfg) => ({ ...DEFAULT_PUBLIC_DATA, ...cfg }));

export const edgeConfigSchema = z.object({
  enableCmdkTooltip: z.boolean(),
  enableReviewEventsTracking: z.boolean(),
  enableReviewSort: z.boolean(),
  enableReviewFilter: z.boolean(),
  enableReviewReactions: z.boolean(),
  // Gates password (Credentials provider) login. Defaults to false
  // (Google-only auth); flipped on via remote Edge Config when needed.
  enablePasswordLogin: z.boolean().default(false),
  // Master switch for report-driven content moderation. Defaults to true:
  // moderation is on unless the remote config sets it to false. It is also
  // optional so a remote config without the key still parses (a new required
  // key would fail validation and discard the whole remote config).
  // Remote-only: no env override, so it cannot be bypassed.
  enableContentModeration: z.boolean().default(true),
  // Per-domain visibility for anonymous users. Every domain is private unless
  // the remote config flips it public; signed-in users always see everything.
  publicData: publicDataSchema,
  // A config whose remote Edge Config hasn't been updated with `chat` yet must
  // still parse. NOTE (zod 4.5+): an inner schema's `.default()` is now applied
  // even when the key is absent/undefined, so `chat` is always populated (with
  // DEFAULT_CHAT_CONFIG when missing). `getChatConfig()` keeps its
  // `?? DEFAULT_CHAT_CONFIG` fallback as defence-in-depth for the raw
  // config.json fallback path.
  chat: chatConfigSchema.optional(),
});

export type EdgeConfig = z.infer<typeof edgeConfigSchema>;
