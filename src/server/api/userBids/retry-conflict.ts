import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";

const MAX_ATTEMPTS = 3;

// The transaction that won the conflict may still be committing. A short,
// jittered pause lets it finish, so the retry sees its rows instead of
// colliding with it again.
const pauseBeforeRetry = (attempt: number) =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, 50 * attempt + Math.floor(Math.random() * 30)),
  );

const isRetryableConflict = (err: unknown) => {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P2002" || err.code === "P2034")
  ) {
    return true;
  }
  if (typeof err === "object" && err !== null) {
    const error = err as {
      code?: string;
      cause?: { originalCode?: string; kind?: string };
    };
    if (error.code === "P2002" || error.code === "P2034") {
      return true;
    }
    if (
      error.cause?.originalCode === "40001" ||
      error.cause?.kind === "TransactionWriteConflict"
    ) {
      return true;
    }
  }
  return false;
};

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
