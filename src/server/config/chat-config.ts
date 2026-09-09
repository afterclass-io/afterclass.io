/**
 * Centralized chat/bid/catalog tunables (Task 8).
 *
 * Canonical home for every runtime number the chat + MCP + bid layers
 * consume: quotas, rate limits, token budgets, spend caps, bid floors, and
 * the app timezone. Precedence: process.env (CHAT/BID/APP keys) >
 * EdgeConfig `chat` section > `config.json` > compiled defaults.
 *
 * Fail-closed contract: every numeric is range-checked (>0 finite, ints
 * where integral). A misconfigured value (negative, zero, NaN, non-numeric)
 * THROWS at the call site instead of silently degrading the whole world
 * into a global 429 (the old `Number(env)` + `Number.isFinite` swallow did
 * exactly that for e.g. CHAT_RATE_LIMIT_PER_MINUTE=-1). Empty-string env
 * values are treated as unset (fall through to the next layer).
 *
 * Defaults equal current behavior — each number was harvested from the code
 * that owns it today (see the source map below); any current-code mismatch
 * wins and the default is corrected, never the runtime.
 *
 * Defaults → source mapping:
 * | Field | Default | Harvested from |
 * |---|---|---|
 * | quotaPerMonth | 50 | `src/server/ecfg/config.ts` DEFAULT_CHAT_CONFIG / config.json |
 * | nudgeAt | 40 | same |
 * | rateLimitPerMinute | 10 | same |
 * | mcpRateLimitPerMinute | 60 | same |
 * | writeRateLimitPerMinute | 10 | `CHAT_WRITE_RATE_LIMIT_PER_MINUTE` fallback = rateLimitPerMinute (10); `src/app/api/ical/[token]/route.ts` ical 60/min kept separate as icalThrottlePerMinute |
 * | rateLimitWindowMinutes | 1 | `getRateLimitWindowMinutes()` fallback |
 * | maxInputTokens | 64000 | brief spec: live ecfg value (config.json still carries the stale 16000; env override documented in .env.example) |
 * | maxOutputTokens | 4096 | brief spec: live ecfg value (config.json stale 1024 — same note) |
 * | maxToolRounds | 12 | brief spec: live ecfg value (config.json stale 6 — same note); route.ts stopWhen(12-round comment) agrees |
 * | spendCapPerMonthUsd | 20 | DEFAULT_CHAT_CONFIG.spendCapPerMonthUsd |
 * | settlementSpikeTokens | 30000 | route.ts SETTLEMENT_SPIKE_FRACTION 0.5 × maxInputTokens 64000 ≈ 32000 → brief pins 30000 as the named tunable (CORRECTION: current code derives threshold = floor(maxInputTokens*0.5); the named constant is new, value per brief) |
 * | maxToolResultChars | 24000 | `MAX_TOOL_RESULT_CHARS` in `src/server/assistant/tools.ts` + `DEFAULT_MAX_OUTPUT_CHARS` in `src/mcp/output-policy.ts` |
 * | minBid | 10 | `MIN_BID` in `src/server/mcp/tools/bid-shared.ts` (+ Task 6 parity pin) |
 * | maxBidBudget | 10000 | `MAX_BUDGET` in `src/server/mcp/tools/write/bids.ts` |
 * | defaultBeatsPct | 70 | `DEFAULT_BEATS_PERCENTAGE` in bid-shared.ts |
 * | maxBidAmount | 99999 | upsert-bid / userBids `.max(99999)` schemas |
 * | appTimezone | Asia/Singapore | `src/server/assistant/month.ts` TZ + format-date-sgt.ts |
 * | icalThrottlePerMinute | 60 | ical route `checkAndIncrement(\`ical:${ip}\`, 60, 1)` |
 * | inFlightStaleMs | 300000 | quota.ts IN_FLIGHT_STALE_MS = 5*60_000 |
 * | rateLimitRetentionWindows | 1440 | ratelimit.ts pruneRateLimits default 1440 |
 * | llmBaseUrl | https://openrouter.ai/api/v1 | providers.ts DEFAULT_LLM_BASE_URL |
 * | llmModel | @preset/afterclass | providers.ts DEFAULT_LLM_MODEL |
 * | chatMaxDurationSec | 300 | route.ts `maxDuration = 300` (Vercel Pro ceiling; Task 9 pins via sync-mirror) |
 */
import { z } from "zod";

import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";
import fallbackJson from "@/server/ecfg/config.json";

const positiveInt = (field: string) =>
  z
    .number({ error: `${field} must be a finite number > 0` })
    .int()
    .positive()
    .finite();

const nonNegativeNumber = (field: string) =>
  z
    .number({ error: `${field} must be a finite number >= 0` })
    .nonnegative()
    .finite();

export const chatConfigSchema = z.object({
  quotaPerMonth: positiveInt("quotaPerMonth"),
  nudgeAt: z
    .number({ error: "nudgeAt must be a finite number >= 0" })
    .int()
    .min(0)
    .finite(),
  rateLimitPerMinute: positiveInt("rateLimitPerMinute"),
  mcpRateLimitPerMinute: positiveInt("mcpRateLimitPerMinute"),
  writeRateLimitPerMinute: positiveInt("writeRateLimitPerMinute"),
  rateLimitWindowMinutes: z
    .number({ error: "rateLimitWindowMinutes must be an int in [1, 60]" })
    .int()
    .min(1)
    .max(60),
  maxInputTokens: positiveInt("maxInputTokens"),
  maxOutputTokens: positiveInt("maxOutputTokens"),
  maxToolRounds: positiveInt("maxToolRounds"),
  spendCapPerMonthUsd: nonNegativeNumber("spendCapPerMonthUsd"),
  settlementSpikeTokens: positiveInt("settlementSpikeTokens"),
  maxToolResultChars: positiveInt("maxToolResultChars"),
  minBid: positiveInt("minBid"),
  maxBidBudget: positiveInt("maxBidBudget"),
  defaultBeatsPct: positiveInt("defaultBeatsPct"),
  maxBidAmount: positiveInt("maxBidAmount"),
  appTimezone: z.string().min(1),
  icalThrottlePerMinute: positiveInt("icalThrottlePerMinute"),
  inFlightStaleMs: positiveInt("inFlightStaleMs"),
  rateLimitRetentionWindows: positiveInt("rateLimitRetentionWindows"),
  llmBaseUrl: z.string().min(1),
  llmModel: z.string().min(1),
  chatMaxDurationSec: positiveInt("chatMaxDurationSec"),
});

export type ChatConfig = z.infer<typeof chatConfigSchema>;

/** spendCapUsd alias kept for the brief's verbatim test (`c.spendCapUsd`). */
export type ChatConfigWithAliases = ChatConfig & { spendCapUsd: number };

export const DEFAULT_CHAT_CONFIG_VALUES: ChatConfig = {
  quotaPerMonth: 50,
  nudgeAt: 40,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  writeRateLimitPerMinute: 10,
  rateLimitWindowMinutes: 1,
  maxInputTokens: 64000,
  maxOutputTokens: 4096,
  maxToolRounds: 12,
  spendCapPerMonthUsd: 20,
  settlementSpikeTokens: 30000,
  maxToolResultChars: 24000,
  minBid: 10,
  maxBidBudget: 10000,
  defaultBeatsPct: 70,
  maxBidAmount: 99999,
  appTimezone: "Asia/Singapore",
  icalThrottlePerMinute: 60,
  inFlightStaleMs: 5 * 60_000,
  rateLimitRetentionWindows: 1440,
  llmBaseUrl: "https://openrouter.ai/api/v1",
  llmModel: "@preset/afterclass",
  chatMaxDurationSec: 300,
};

/** Env key → config field, with the parser applied to the raw env string.
 * Note: the legacy live names (CHAT_RATE_LIMIT_PER_MINUTE,
 * CHAT_MCP_RATE_LIMIT_PER_MINUTE, CHAT_WRITE_RATE_LIMIT_PER_MINUTE,
 * CHAT_RATE_LIMIT_WINDOW_MINUTES, CHAT_MAX_INPUT_TOKENS) ARE the canonical
 * env names — kept verbatim so existing deploys keep working. The
 * CHAT_QUOTA_PER_MONTH-style aliases are the brief's proposed renames,
 * accepted at lower precedence. */
const ENV_BINDINGS = [
  ["CHAT_RATE_LIMIT_PER_MINUTE", "rateLimitPerMinute", Number],
  ["CHAT_MCP_RATE_LIMIT_PER_MINUTE", "mcpRateLimitPerMinute", Number],
  ["CHAT_WRITE_RATE_LIMIT_PER_MINUTE", "writeRateLimitPerMinute", Number],
  ["CHAT_RATE_LIMIT_WINDOW_MINUTES", "rateLimitWindowMinutes", Number],
  ["CHAT_MAX_INPUT_TOKENS", "maxInputTokens", Number],
  ["CHAT_MAX_OUTPUT_TOKENS", "maxOutputTokens", Number],
  ["CHAT_MAX_TOOL_ROUNDS", "maxToolRounds", Number],
  ["CHAT_QUOTA_PER_MONTH", "quotaPerMonth", Number],
  ["CHAT_NUDGE_AT", "nudgeAt", Number],
  ["CHAT_SPEND_CAP_USD", "spendCapPerMonthUsd", Number],
  ["CHAT_SPEND_CAP_PER_MONTH_USD", "spendCapPerMonthUsd", Number],
  ["CHAT_SETTLEMENT_SPIKE_TOKENS", "settlementSpikeTokens", Number],
  ["CHAT_MAX_TOOL_RESULT_CHARS", "maxToolResultChars", Number],
  ["BID_MIN_AMOUNT", "minBid", Number],
  ["BID_MAX_BUDGET", "maxBidBudget", Number],
  ["BID_DEFAULT_BEATS_PCT", "defaultBeatsPct", Number],
  ["BID_MAX_AMOUNT", "maxBidAmount", Number],
  ["APP_TIMEZONE", "appTimezone", String],
  ["CHAT_ICAL_THROTTLE_PER_MINUTE", "icalThrottlePerMinute", Number],
  ["CHAT_IN_FLIGHT_STALE_MS", "inFlightStaleMs", Number],
  ["CHAT_RATE_LIMIT_RETENTION_WINDOWS", "rateLimitRetentionWindows", Number],
  ["LLM_BASE_URL", "llmBaseUrl", String],
  ["LLM_MODEL", "llmModel", String],
  ["CHAT_MAX_DURATION_SEC", "chatMaxDurationSec", Number],
] as const;

type RawLayer = Partial<Record<keyof ChatConfig, unknown>>;

function readEnvLayer(env: NodeJS.ProcessEnv = process.env): RawLayer {
  const out: RawLayer = {};
  for (const [envKey, field, parse] of ENV_BINDINGS) {
    const raw = env[envKey];
    if (raw === undefined || raw === "") continue; // empty string = unset
    if (out[field] !== undefined) continue; // first (canonical) name wins
    out[field] = parse === Number ? Number(raw) : raw;
  }
  return out;
}

/** Legacy camelCase EdgeConfig/config.json chat keys → canonical fields. */
const CHAT_KEY_ALIASES: Record<string, keyof ChatConfig> = {
  spendCapUsd: "spendCapPerMonthUsd",
  spendCapPerMonthUsd: "spendCapPerMonthUsd",
  writeRateLimitPerMinute: "writeRateLimitPerMinute",
};

function normalizeChatLayer(raw: unknown): RawLayer {
  if (!raw || typeof raw !== "object") return {};
  const out: RawLayer = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const field = (CHAT_KEY_ALIASES[k] ?? k) as keyof ChatConfig;
    if (field in DEFAULT_CHAT_CONFIG_VALUES) out[field] = v;
  }
  return out;
}

function edgeChatLayer(edge: unknown): RawLayer {
  if (!edge || typeof edge !== "object") return {};
  const chat = (edge as { chat?: unknown }).chat;
  return normalizeChatLayer(chat);
}

function fileChatLayer(): RawLayer {
  try {
    const chat = (fallbackJson as { chat?: unknown }).chat;
    return normalizeChatLayer(chat);
  } catch {
    return {};
  }
}

/**
 * Synchronous canonical config: env > config.json > defaults.
 * (EdgeConfig is async-only — use getChatConfigAsync() when the Edge layer
 * matters. The sync path is what tests and fail-closed call sites use.)
 */
export function getChatConfig(
  env: NodeJS.ProcessEnv = process.env,
): ChatConfigWithAliases {
  const merged: RawLayer = {
    ...fileChatLayer(),
    ...readEnvLayer(env),
  };
  const parsed = chatConfigSchema
    .strict()
    .parse({ ...DEFAULT_CHAT_CONFIG_VALUES, ...merged });
  return { ...parsed, spendCapUsd: parsed.spendCapPerMonthUsd };
}

/**
 * Full precedence incl. the live EdgeConfig layer:
 * env > EdgeConfig > config.json > defaults.
 */
export async function getChatConfigAsync(): Promise<ChatConfigWithAliases> {
  let edge: unknown = null;
  try {
    edge = await getEdgeConfig();
  } catch {
    edge = null;
  }
  const merged: RawLayer = {
    ...fileChatLayer(),
    ...edgeChatLayer(edge),
    ...readEnvLayer(),
  };
  const parsed = chatConfigSchema
    .strict()
    .parse({ ...DEFAULT_CHAT_CONFIG_VALUES, ...merged });
  return { ...parsed, spendCapUsd: parsed.spendCapPerMonthUsd };
}

/**
 * Canonical bid floors for zod schemas and hot paths (Task 13): the
 * sync-mirror literals in `bid-shared.ts` / `write/bids.ts` /
 * `write/recommend.ts` read through here, so env/file overrides move every
 * consumer at once. Sync path (env > file > defaults); zod schemas can call
 * functions at module scope, so static schemas stay valid.
 */
export function getBidLimits(): {
  minBid: number;
  maxBidBudget: number;
  defaultBeatsPct: number;
  maxBidAmount: number;
} {
  const c = getChatConfig();
  return {
    minBid: c.minBid,
    maxBidBudget: c.maxBidBudget,
    defaultBeatsPct: c.defaultBeatsPct,
    maxBidAmount: c.maxBidAmount,
  };
}

/**
 * Canonical tool-output budget (Task 13): maxChars + truncation note for
 * the dispatch text shape and output-policy truncation. Single source so
 * `tools.ts` and `output-policy.ts` can never drift apart again.
 */
export function getToolOutputBudget(): { maxChars: number; note: string } {
  const c = getChatConfig();
  return {
    maxChars: c.maxToolResultChars,
    note: "\n[truncated - result too large; refine your query or request fewer items]",
  };
}

/** Effective per-minute limit for chat write-tool executions (chat-write: budget).
 * Central config read (allowlisted): this module IS the single place raw
 * CHAT_* env reads live, alongside env.ts (schema) and env-gate.ts (gate).
 * C2 precedence preserved: env-override-then-fallback; fail-closed throws
 * on non-positive/non-finite instead of silently 429ing.
 * An explicit `writeRateLimitPerMinute` (e.g. from the canonical config)
 * takes precedence over the env read so Edge/file layers are honored when
 * the caller already resolved them; the env read is the fallback. */
export function getChatWriteRateLimit(chat: {
  rateLimitPerMinute: number;
  writeRateLimitPerMinute?: number;
}): number {
  if (
    chat.writeRateLimitPerMinute !== undefined &&
    chat.writeRateLimitPerMinute !== null
  ) {
    const n = chat.writeRateLimitPerMinute;
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      throw new Error(
        `getChatWriteRateLimit: invalid writeRateLimitPerMinute ${JSON.stringify(n)} — must be a finite integer > 0`,
      );
    }
    return n;
  }
  const raw = process.env.CHAT_WRITE_RATE_LIMIT_PER_MINUTE;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(
        `getChatWriteRateLimit: invalid CHAT_WRITE_RATE_LIMIT_PER_MINUTE ${JSON.stringify(raw)} — must be a finite number > 0`,
      );
    }
    return n;
  }
  return chat.rateLimitPerMinute;
}

/** Effective fixed-window size in minutes for rate limiting.
 * Central config read (allowlisted — see getChatWriteRateLimit above).
 * An explicit `rateLimitWindowMinutes` (e.g. from the canonical config)
 * takes precedence over the env read so Edge/file layers are honored when
 * the caller already resolved them; the env read is the fallback. */
export function getRateLimitWindowMinutes(canonical?: {
  rateLimitWindowMinutes?: number;
}): number {
  if (
    canonical?.rateLimitWindowMinutes !== undefined &&
    canonical?.rateLimitWindowMinutes !== null
  ) {
    const n = canonical.rateLimitWindowMinutes;
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 60) {
      throw new Error(
        `getRateLimitWindowMinutes: invalid rateLimitWindowMinutes ${JSON.stringify(n)} — must be an int in [1, 60]`,
      );
    }
    return n;
  }
  const raw = process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 60) {
      throw new Error(
        `getRateLimitWindowMinutes: invalid CHAT_RATE_LIMIT_WINDOW_MINUTES ${JSON.stringify(raw)} — must be an int in [1, 60]`,
      );
    }
    return n;
  }
  return 1;
}
