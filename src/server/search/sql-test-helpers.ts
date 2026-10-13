import { Prisma } from "@/generated/prisma/client";

/** Inspect composed tagged SQL as PostgreSQL receives it, preserving all assertions. */
export function readSqlCall(call: unknown[]): [string[], ...unknown[]] {
  const sql = Prisma.sql(call[0] as TemplateStringsArray, ...call.slice(1));
  return [sql.strings, ...sql.values];
}
