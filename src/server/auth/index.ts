import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";
import { setSentryUser } from "./sentryUser";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

// Re-derive the Sentry user from *this* request's session on every read.
const auth = cache(async () => {
  const session = await uncachedAuth();
  setSentryUser(session);
  return session;
});

export { auth, handlers, signIn, signOut };
