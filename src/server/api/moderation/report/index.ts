import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";
import { runAfterResponse } from "@/server/after-response";
import { verifiedProcedure } from "@/server/api/trpc";
import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getChatConfigAsync } from "@/server/config/chat-config";
import { runModerationTask } from "@/server/moderation/run";
import {
  MODERATION_SURFACES,
  REPORT_SURFACES,
} from "@/server/moderation/surfaces";

/**
 * The single response for every accepted, duplicate, self or unknown-item
 * report. It reveals nothing about the item, its state or its report count.
 */
export const REPORT_ACK = { received: true } as const;

export const reportInput = z.object({
  surface: z.enum(REPORT_SURFACES),
  /** Review id or roadmap id (see surfaces.ts). */
  ref: z.string().trim().min(1).max(64),
});

export const report = verifiedProcedure
  .input(reportInput)
  .mutation(async ({ ctx, input }) => {
    const ecfg = await getEdgeConfig();
    if (!ecfg.enableContentModeration) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Reporting is unavailable",
      });
    }

    const cfg = await getChatConfigAsync();
    const reporterId = ctx.session.user.id;
    const limit = await checkAndIncrement(
      `moderation:report:${reporterId}`,
      cfg.moderationReportsPerHour,
      60,
    );
    if (!limit.ok) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Try again in ${limit.retryAfterSeconds} seconds.`,
      });
    }

    const adapter = MODERATION_SURFACES[input.surface];
    const item = await adapter.resolve(ctx.db, input.ref);
    if (!item || item.ownerId === reporterId) return REPORT_ACK;

    // ON CONFLICT DO NOTHING: a duplicate is a silent no-op, not an error.
    let count: number;
    try {
      ({ count } = await ctx.db.moderationReport.createMany({
        data: [adapter.reportData(reporterId, item.itemId)],
        skipDuplicates: true,
      }));
    } catch (error) {
      // The item was deleted between resolve and insert (FK violation):
      // answer exactly like any other report.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return REPORT_ACK;
      }
      throw error;
    }
    if (count > 0) {
      runAfterResponse(() =>
        runModerationTask({ surface: input.surface, itemId: item.itemId }),
      );
    }
    return REPORT_ACK;
  });
