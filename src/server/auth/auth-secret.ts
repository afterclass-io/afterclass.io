import { env } from "@/env";

/**
 * The app secret used to sign and verify session cookies, confirm tokens and
 * the consent CSRF token. `NEXTAUTH_SECRET` wins; `AUTH_SECRET` is the
 * Auth.js alias. Production env validation requires `NEXTAUTH_SECRET`, so the
 * alias only matters in dev and test. Read it here, never from `process.env`.
 */
export function getAuthSecret(): string | undefined {
  return env.NEXTAUTH_SECRET ?? env.AUTH_SECRET;
}
