import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  copyRoadmapToUser,
  type CopyableRoadmap,
} from "@/server/api/roadmaps/copyRoadmap";
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from "@/server/db-errors";

/**
 * Clone a roadmap into the caller's account and map constraint failures to
 * tRPC errors. Shared by `copyPublic` and `copyShared`.
 */
export async function copyRoadmapMappingErrors(
  db: PrismaClient,
  source: CopyableRoadmap,
  userId: string,
) {
  try {
    return await copyRoadmapToUser(db, source, userId);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot copy this roadmap — it contains an unknown course.",
      });
    }
    if (isUniqueConstraintViolation(err)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Duplicate course detected — refresh and try again.",
      });
    }
    throw err;
  }
}
