import { atom } from "jotai";
import type { RouterOutputs } from "@/common/tools/trpc/react";

type UserBidOutput = RouterOutputs["userBids"]["getByClassIds"][number];

/**
 * Map of classId → UserBid[] for the active timetable.
 * Populated by one batched `userBids.getByClassIds` query on the timetable page.
 */
export const slotBidsAtom = atom<Record<string, UserBidOutput[]>>({});
