import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import validator from "validator";

const siteUrlValidator = (vercelUrlEnv?: string) =>
  z
    .optional(z.string())
    .transform((str) => {
      let url = str ?? vercelUrlEnv ?? "http://localhost:3000";
      url = url.startsWith("http") ? url : `https://${url}`;
      return url;
    })
    .pipe(z.url());

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.url(),
    // Direct (non-pooled) connection, used for migrations and interactive
    // transactions (Task 9 consumes this; validation lands here in Task 8).
    DIRECT_URL: z.url().optional(),
    // Vercel Edge Config connection string (live config layer).
    EDGE_CONFIG: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    // VERCEL_URL is automatically set by Vercel
    // as system environment variable. doesn't include `https`
    // https://vercel.com/docs/projects/environment-variables/system-environment-variables
    NEXTAUTH_URL: siteUrlValidator(
      process.env.VERCEL_ENV === "production"
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.VERCEL_URL,
    ),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    // LLM provider (OpenAI-compatible) - any endpoint that speaks the OpenAI chat API.
    // Degraded mode: the key is optional so the app boots and serves browsing
    // without it (chat turns 503 via isLlmConfigured()). Fail-closed per turn:
    // empty strings are already treated as undefined (emptyStringAsUndefined),
    // and resolveLlmEnv() in providers.ts still throws when called without a
    // key — getModel() is the single throw site.
    LLM_API_KEY: z.string().min(1).optional(),
    LLM_BASE_URL: z.string().min(1).optional(),
    LLM_MODEL: z.string().min(1).optional(),
    // Optional rate-limit overrides (per minute, fixed window). When set they
    // override the defaults in src/server/ecfg/config.json.
    CHAT_QUOTA_PER_MONTH: z.coerce.number().int().min(1).max(10000).optional(),
    CHAT_NUDGE_AT: z.coerce.number().int().min(0).max(10000).optional(),
    CHAT_RATE_LIMIT_PER_MINUTE: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional(),
    CHAT_MCP_RATE_LIMIT_PER_MINUTE: z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional(),
    CHAT_WRITE_RATE_LIMIT_PER_MINUTE: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional(),
    CHAT_RATE_LIMIT_WINDOW_MINUTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(60)
      .optional(),
    CHAT_MAX_INPUT_TOKENS: z.coerce.number().int().min(1).optional(),
    CHAT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).optional(),
    CHAT_MAX_TOOL_ROUNDS: z.coerce.number().int().min(1).max(100).optional(),
    CHAT_SETTLEMENT_SPIKE_TOKENS: z.coerce.number().int().min(1).optional(),
    CHAT_MAX_TOOL_RESULT_CHARS: z.coerce.number().int().min(1).optional(),
    CHAT_ICAL_THROTTLE_PER_MINUTE: z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional(),
    CHAT_IN_FLIGHT_STALE_MS: z.coerce.number().int().min(1).optional(),
    CHAT_RATE_LIMIT_RETENTION_WINDOWS: z.coerce
      .number()
      .int()
      .min(1)
      .optional(),
    // Canonical schema demands positive (>0); env.ts fails fast here too so
    // misconfig surfaces at boot with a clear field error.
    BID_MIN_AMOUNT: z.coerce.number().int().min(1).optional(),
    BID_MAX_BUDGET: z.coerce.number().int().min(1).optional(),
    BID_DEFAULT_BEATS_PCT: z.coerce.number().int().min(1).max(100).optional(),
    BID_MAX_AMOUNT: z.coerce.number().int().min(1).optional(),
    APP_TIMEZONE: z.string().min(1).optional(),
    // MCP dev-bypass knobs (validated here so typos fail loudly; the single
    // isDevBypass() gate in src/mcp/env-gate.ts owns the semantics).
    MCP_DEV_BYPASS: z.string().optional(),
    MCP_DEV_USER_EMAIL: z.email().optional(),
    MCP_USE_OAUTH_SUPABASE_PROJECT_ID: z.string().min(1).optional(),
    MCP_USE_OAUTH_SUPABASE_URL: z.url().optional(),
    MCP_USE_OAUTH_SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    // MCP transport hardening (validated here so typos fail loudly;
    // src/mcp/server.ts owns the semantics — comma-separated allowlists,
    // unset by default for local dev).
    MCP_ALLOWED_HOSTS: z.string().optional(),
    MCP_ALLOWED_ORIGINS: z.string().optional(),
    // Cron bearer secret (Task 12): cron routes read env.CRON_SECRET with a
    // raw-process fallback + loud 500 when unset. Optional here so
    // secret-less dev boots; prod must set it on Vercel (Task 14 gate).
    CRON_SECRET: z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
    // NEXT_PUBLIC_VERCEL_URL is automatically set by Vercel
    // as system environment variable. doesn't include `https`
    // https://vercel.com/docs/projects/environment-variables/system-environment-variables
    NEXT_PUBLIC_SITE_URL: siteUrlValidator(
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
        ? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
        : process.env.NEXT_PUBLIC_VERCEL_URL,
    ),
    NEXT_PUBLIC_OLD_SITE_URL: z.url().default("https://old.afterclass.io"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS: z
      .string()
      .transform((value) => value.split(","))
      .pipe(
        z
          .string()
          .array()
          .superRefine((val, ctx) => {
            val.map((v) => {
              if (!validator.isFQDN(v)) {
                ctx.addIssue({
                  code: "custom",
                  message: `Invalid FQDN: ${v}`,
                });
                return z.NEVER;
              }
            });
          }),
      ),
    NEXT_PUBLIC_AC_CHANNEL_LINK: z.url(),
    NEXT_PUBLIC_AC_HELPDESK_LINK: z.url(),
    NEXT_PUBLIC_AC_GITHUB_LINK: z.url(),
    // Public MCP endpoint used by the Settings -> Agents connect page to build
    // deep links. Optional until the server is deployed - connect-links.ts
    // falls back to a placeholder URL.
    NEXT_PUBLIC_MCP_PUBLIC_URL: z.url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    EDGE_CONFIG: process.env.EDGE_CONFIG,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
    CHAT_QUOTA_PER_MONTH: process.env.CHAT_QUOTA_PER_MONTH,
    CHAT_NUDGE_AT: process.env.CHAT_NUDGE_AT,
    CHAT_RATE_LIMIT_PER_MINUTE: process.env.CHAT_RATE_LIMIT_PER_MINUTE,
    CHAT_MCP_RATE_LIMIT_PER_MINUTE: process.env.CHAT_MCP_RATE_LIMIT_PER_MINUTE,
    CHAT_WRITE_RATE_LIMIT_PER_MINUTE:
      process.env.CHAT_WRITE_RATE_LIMIT_PER_MINUTE,
    CHAT_RATE_LIMIT_WINDOW_MINUTES: process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES,
    CHAT_MAX_INPUT_TOKENS: process.env.CHAT_MAX_INPUT_TOKENS,
    CHAT_MAX_OUTPUT_TOKENS: process.env.CHAT_MAX_OUTPUT_TOKENS,
    CHAT_MAX_TOOL_ROUNDS: process.env.CHAT_MAX_TOOL_ROUNDS,
    CHAT_SETTLEMENT_SPIKE_TOKENS: process.env.CHAT_SETTLEMENT_SPIKE_TOKENS,
    CHAT_MAX_TOOL_RESULT_CHARS: process.env.CHAT_MAX_TOOL_RESULT_CHARS,
    CHAT_ICAL_THROTTLE_PER_MINUTE: process.env.CHAT_ICAL_THROTTLE_PER_MINUTE,
    CHAT_IN_FLIGHT_STALE_MS: process.env.CHAT_IN_FLIGHT_STALE_MS,
    CHAT_RATE_LIMIT_RETENTION_WINDOWS:
      process.env.CHAT_RATE_LIMIT_RETENTION_WINDOWS,
    BID_MIN_AMOUNT: process.env.BID_MIN_AMOUNT,
    BID_MAX_BUDGET: process.env.BID_MAX_BUDGET,
    BID_DEFAULT_BEATS_PCT: process.env.BID_DEFAULT_BEATS_PCT,
    BID_MAX_AMOUNT: process.env.BID_MAX_AMOUNT,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
    MCP_DEV_BYPASS: process.env.MCP_DEV_BYPASS,
    MCP_DEV_USER_EMAIL: process.env.MCP_DEV_USER_EMAIL,
    MCP_USE_OAUTH_SUPABASE_PROJECT_ID:
      process.env.MCP_USE_OAUTH_SUPABASE_PROJECT_ID,
    MCP_USE_OAUTH_SUPABASE_URL: process.env.MCP_USE_OAUTH_SUPABASE_URL,
    MCP_USE_OAUTH_SUPABASE_JWT_SECRET:
      process.env.MCP_USE_OAUTH_SUPABASE_JWT_SECRET,
    MCP_ALLOWED_HOSTS: process.env.MCP_ALLOWED_HOSTS,
    MCP_ALLOWED_ORIGINS: process.env.MCP_ALLOWED_ORIGINS,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_OLD_SITE_URL: process.env.NEXT_PUBLIC_OLD_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS:
      process.env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS,
    NEXT_PUBLIC_AC_CHANNEL_LINK: process.env.NEXT_PUBLIC_AC_CHANNEL_LINK,
    NEXT_PUBLIC_AC_HELPDESK_LINK: process.env.NEXT_PUBLIC_AC_HELPDESK_LINK,
    NEXT_PUBLIC_AC_GITHUB_LINK: process.env.NEXT_PUBLIC_AC_GITHUB_LINK,
    NEXT_PUBLIC_MCP_PUBLIC_URL: process.env.NEXT_PUBLIC_MCP_PUBLIC_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * This is especially useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
