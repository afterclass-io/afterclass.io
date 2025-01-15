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
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
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
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_OLD_SITE_URL: process.env.NEXT_PUBLIC_OLD_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS:
      process.env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS,
    NEXT_PUBLIC_AC_CHANNEL_LINK: process.env.NEXT_PUBLIC_AC_CHANNEL_LINK,
    NEXT_PUBLIC_AC_HELPDESK_LINK: process.env.NEXT_PUBLIC_AC_HELPDESK_LINK,
    NEXT_PUBLIC_AC_GITHUB_LINK: process.env.NEXT_PUBLIC_AC_GITHUB_LINK,
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
