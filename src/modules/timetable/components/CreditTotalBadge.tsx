"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { api } from "@/common/tools/trpc/react";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";
import { cn } from "@/common/functions";

/**
 * Sums credit units of all slots in the active timetable and renders a
 * color-coded badge:
 * - Default (green):        ≤ 5.5 CU
 * - Warning  (amber):       > 5.5 and ≤ 6.5 CU
 * - Error    (red):         > 6.5 CU
 */
export function CreditTotalBadge() {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);

  const { data } = api.timetable.getArrangement.useQuery(
    { timetableId: activeTimetableId ?? "" },
    { enabled: !!activeTimetableId },
  );

  const total = useMemo(() => {
    if (!data?.slots) return 0;
    return data.slots.reduce((sum, s) => sum + s.creditUnits, 0);
  }, [data]);

  if (!activeTimetableId) return null;

  const variant =
    total > 6.5 ? "error" : total > 5.5 ? "warning" : "default";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        variant === "warning" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        variant === "error" &&
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      )}
      title={`Total credit units: ${total}`}
    >
      {total.toFixed(1)} CU
    </span>
  );
}
