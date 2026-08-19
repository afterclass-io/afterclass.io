/**
 * saveEntries version-token helpers.
 *
 * The client sends its getMine snapshot's `roadmap.updatedAt` as an optimistic
 * concurrency token, but in-session mutations (auto progress-sync on mount,
 * setMatricTerm/rename/setActive, an earlier in-flight save) bump the server's
 * `updatedAt` after that snapshot — and the refetch that would resync the
 * token is async. A save issued in that window (or a second save while the
 * first is still in flight) trips the CONFLICT check on normal single-device
 * editing. `saveEntriesWithConflictRetry` absorbs that first CONFLICT by
 * refetching the token and resending once; a second CONFLICT means a genuine
 * cross-device edit and rethrows for the caller to surface.
 */

/** tRPC client errors carry the server error code at `error.data.code`. */
export function isConflictError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { data?: { code?: unknown } }).data?.code === "CONFLICT"
  );
}

export async function saveEntriesWithConflictRetry<
  TInput extends { updatedAt?: string },
>(
  input: TInput,
  save: (next: TInput) => Promise<unknown>,
  getFreshUpdatedAt: () => Promise<string | undefined>,
): Promise<void> {
  try {
    await save(input);
  } catch (error) {
    // Only the version check is retriable — a CONFLICT raised with no token
    // sent is the duplicate-course backstop, which a retry cannot fix.
    if (!input.updatedAt || !isConflictError(error)) throw error;
    const freshUpdatedAt = await getFreshUpdatedAt();
    await save({ ...input, updatedAt: freshUpdatedAt });
  }
}
