const FALLBACK_NAME = "Student";

/**
 * Display name for a user in collaborative views. Built from the live
 * first/last name; never falls back to the username or email because both are
 * id-like (`user_<random>`) or private.
 */
export function formatUserDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const fullName = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return fullName || FALLBACK_NAME;
}

/** Up to two upper-case initials of a display name, e.g. "Alice Tan" -> "AT". */
export function getNameInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = [words[0], words.length > 1 ? words.at(-1) : undefined]
    .map((word) => word?.[0]?.toUpperCase() ?? "")
    .join("");
  return initials || FALLBACK_NAME[0]!;
}
