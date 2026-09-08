import * as Sentry from "@sentry/nextjs";
import { type Session } from "next-auth";

/**
 * Bind the signed-in user to Sentry's isolation scope, which `@sentry/nextjs`
 * creates fresh per request — unlike the global scope it cannot bleed into
 * other concurrent requests on the same server process.
 */
export const setSentryUser = (session: Session | null) => {
  const user = session?.user;
  Sentry.setUser(
    user ? { id: user.id, email: user.email, username: user.username } : null,
  );
};
