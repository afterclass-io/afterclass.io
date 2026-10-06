import type { GoogleProfile } from "next-auth/providers/google";

export type NameFields = { firstName?: string; lastName?: string };

/** First and last name from a Google profile; empty parts are omitted so they never overwrite stored values. */
export function getGoogleNameFields(
  profile: Partial<GoogleProfile> | null | undefined,
): NameFields {
  const firstName = profile?.given_name?.trim();
  const lastName = profile?.family_name?.trim();
  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}
