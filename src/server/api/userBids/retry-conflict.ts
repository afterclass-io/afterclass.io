import { TRPCError } from "@trpc/server";

import {
  isUniqueConstraintViolation,
  prismaErrorCode,
} from "@/server/db-errors";

const MAX_ATTEMPTS = 3;

// The transaction that won the conflict may still be committing. A short,
// jittered pause lets it finish, so the retry sees its rows instead of
// colliding with it again.
const pauseBeforeRetry = (attempt: number) =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, 50 * attempt + Math.floor(Math.random() * 30)),
  );

// Prisma maps most serialization failures to P2034. The pg driver adapter can
// also throw its own error whose cause kind is "TransactionWriteConflict" from
// a raw query inside the transaction, before Prisma maps it.
const isRetryableConflict = (err: unknown) => {
  const cause = (err as { cause?: { kind?: unknown } } | null)?.cause;
  return (
    isUniqueConstraintViolation(err) ||
    prismaErrorCode(err) === "P2034" ||
    cause?.kind === "TransactionWriteConflict"
  );
};

/** Run a transaction attempt again when it loses a write conflict. */
export async function withConflictRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      if (!isRetryableConflict(err)) {
        throw err;
      }
      if (attempt === MAX_ATTEMPTS) {
        throw new TRPCError({
          code: "CONFLICT",
          cause: err,
          message: "Another change is in progress. Try again.",
        });
      }
      await pauseBeforeRetry(attempt);
    }
  }
}
