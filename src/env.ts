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
    .pipe(z.string().url());

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
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
    LLM_API_KEY: z.string(),
    LLM_BASE_URL: z.string().optional(),
    LLM_MODEL: z.string().optional(),
    // Optional rate-limit overrides (per minute, fixed window). When set they
    // override the defaults in src/server/ecfg/config.json.
    CHAT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1000).optional(),
    CHAT_MCP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10000).optional(),
    CHAT_WRITE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1000).optional(),
    CHAT_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(60).optional(),
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
    NEXT_PUBLIC_OLD_SITE_URL: z
      .string()
      .url()
      .default("https://old.afterclass.io"),
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
                  code: z.ZodIssueCode.custom,
                  message: `Invalid FQDN: ${v}`,
                  fatal: true,
                });
                return z.NEVER;
              }
            });
          }),
      ),
    NEXT_PUBLIC_AC_CHANNEL_LINK: z.string().url(),
    NEXT_PUBLIC_AC_HELPDESK_LINK: z.string().url(),
    NEXT_PUBLIC_AC_GITHUB_LINK: z.string().url(),
    // Public MCP endpoint used by the Settings -> Agents connect page to build
    // deep links. Optional until the server is deployed - connect-links.ts
    // falls back to a placeholder URL.
    NEXT_PUBLIC_MCP_PUBLIC_URL: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
    CHAT_RATE_LIMIT_PER_MINUTE: process.env.CHAT_RATE_LIMIT_PER_MINUTE,
    CHAT_MCP_RATE_LIMIT_PER_MINUTE: process.env.CHAT_MCP_RATE_LIMIT_PER_MINUTE,
    CHAT_WRITE_RATE_LIMIT_PER_MINUTE: process.env.CHAT_WRITE_RATE_LIMIT_PER_MINUTE,
    CHAT_RATE_LIMIT_WINDOW_MINUTES: process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES,
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
