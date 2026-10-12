import { z } from "zod";
import type { UserBid } from "@/generated/prisma/client";
import { protectedProcedure } from "@/server/api/trpc";
import { getBidLimits } from "@/server/config/chat-config";

/**
 * Saves up to 20 bids. Validation failures are reported per entry. The valid
 * entries are written in ONE transaction, so a database error fails all of
 * them with the same message and none is saved. This is deliberate: a batch
 * is either saved whole or not at all, in one round trip. `UpsertManyResult`
 * is the per-entry shape that MCP `save-bids` returns.
 */
export type UpsertManyResult =
  { ok: true; bid: UserBid } | { ok: false; message: string };

export const upsertMany = protectedProcedure
  .input(
    z.object({
      entries: z
        .array(
          z.object({
            classId: z.string(),
            bidWindowId: z.number().int().positive(),
            bidAmount: z.number().positive().max(getBidLimits().maxBidAmount),
            notes: z.string().max(500).optional(),
          }),
        )
        .min(1)
        .max(20),
    }),
  )
  .mutation(async ({ ctx, input }): Promise<UpsertManyResult[]> => {
    const distinctWindowIds = [
      ...new Set(input.entries.map((e) => e.bidWindowId)),
    ];
    const distinctClassIds = [...new Set(input.entries.map((e) => e.classId))];

    const [windows, classes] = await Promise.all([
      ctx.db.bidWindow.findMany({
        where: { id: { in: distinctWindowIds } },
        select: { id: true, acadTermId: true },
      }),
      ctx.db.classes.findMany({
        where: { id: { in: distinctClassIds } },
        select: { id: true, acadTermId: true },
      }),
    ]);

    const windowMap = new Map(windows.map((w) => [w.id, w]));
    const classMap = new Map(classes.map((c) => [c.id, c]));

    const results = new Array<UpsertManyResult>(input.entries.length);
    const validEntriesToExecute: Array<{
      index: number;
      entry: (typeof input.entries)[number];
    }> = [];

    for (let i = 0; i < input.entries.length; i++) {
      const entry = input.entries[i]!;
      const window = windowMap.get(entry.bidWindowId);
      if (!window) {
        results[i] = { ok: false, message: "Unknown bid window" };
        continue;
      }
      const cls = classMap.get(entry.classId);
      if (cls?.acadTermId !== window.acadTermId) {
        results[i] = {
          ok: false,
          message: "Class does not belong to this academic term",
        };
        continue;
      }
      validEntriesToExecute.push({ index: i, entry });
    }

    if (validEntriesToExecute.length > 0) {
      try {
        const txOperations = validEntriesToExecute.map(({ entry }) => {
          const updateData: { bidAmount: number; notes?: string } = {
            bidAmount: entry.bidAmount,
          };
          if (entry.notes !== undefined) {
            updateData.notes = entry.notes;
          }
          const createData: {
            userId: string;
            classId: string;
            bidWindowId: number;
            bidAmount: number;
            status: "PLANNED";
            notes?: string;
          } = {
            userId: ctx.session.user.id,
            classId: entry.classId,
            bidWindowId: entry.bidWindowId,
            bidAmount: entry.bidAmount,
            status: "PLANNED",
          };
          if (entry.notes !== undefined) {
            createData.notes = entry.notes;
          }
          return ctx.db.userBid.upsert({
            where: {
              userId_classId_bidWindowId: {
                userId: ctx.session.user.id,
                classId: entry.classId,
                bidWindowId: entry.bidWindowId,
              },
            },
            update: updateData,
            create: createData,
          });
        });

        const txResults = await ctx.db.$transaction(txOperations);
        for (let j = 0; j < validEntriesToExecute.length; j++) {
          const item = validEntriesToExecute[j]!;
          results[item.index] = { ok: true, bid: txResults[j]! };
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save bid";
        for (const item of validEntriesToExecute) {
          results[item.index] = { ok: false, message };
        }
      }
    }

    return results;
  });
