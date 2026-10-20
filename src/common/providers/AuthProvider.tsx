"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  // The session is a JWT the server checks on every request, so re-fetching
  // /api/auth/session on each tab focus only adds function invocations.
  // Sign-in and sign-out still update the session, across tabs too.
  return (
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  );
}
