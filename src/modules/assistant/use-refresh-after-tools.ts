"use client";

import { useEffect, useRef } from "react";
import { api } from "@/common/tools/trpc/react";

/**
 * After a run completes, the assistant's MCP write tools may have touched
 * roadmaps, timetables, bids or courses. Invalidate those caches so the rest
 * of the app reflects the change without a manual refresh.
 */
export function useRefreshAfterTools(status: "submitted" | "streaming" | "ready" | "error") {
  const utils = api.useUtils();
  const prev = useRef(status);

  useEffect(() => {
    const wasRunning = prev.current === "streaming" || prev.current === "submitted";
    const running = status === "streaming" || status === "submitted";
    prev.current = status;
    if (!wasRunning || running) return;

    void Promise.allSettled([
      utils.roadmaps.invalidate(),
      utils.timetable.invalidate(),
      utils.userBids.invalidate(),
      utils.courses.invalidate(),
    ]);
  }, [status, utils]);
}
