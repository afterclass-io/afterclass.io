/**
 * Shared Prisma error helpers.
 *
 * Plain objects (e.g. `{ code: "P2002" }`) and augmented Error instances are
 * accepted in addition to real `Prisma.PrismaClientKnownRequestError` instances
 * because many existing tests mock Prisma rejections with lightweight objects.
 * No class-instance check is needed because checking for a string `code`
 * property covers both real Prisma error classes and test mock shapes.
 */

/**
 * Extracts a Prisma error code if `err` is a non-null object with a string `code`.
 */
export function prismaErrorCode(err: unknown): string | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string"
  ) {
    return err.code;
  }
  return undefined;
}

/**
 * Checks if the error represents a Prisma unique constraint violation (P2002).
 */
export function isUniqueConstraintViolation(err: unknown): boolean {
  return prismaErrorCode(err) === "P2002";
}

/**
 * Checks if the error represents a Prisma foreign key violation (P2003).
 */
export function isForeignKeyViolation(err: unknown): boolean {
  return prismaErrorCode(err) === "P2003";
}
