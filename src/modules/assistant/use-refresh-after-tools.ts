"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { api } from "@/common/tools/trpc/react";
import { toolLabel, type ToolPart } from "./tool-part";

/**
 * After a run completes, the assistant's MCP write tools may have touched
 * roadmaps, timetables, bids or courses. Invalidate those caches so the rest
 * of the app reflects the change without a manual refresh.
 *
 * Narrowing (M12): inspect the completed turn's tool parts and invalidate
 * only the routers whose naming roots appear in a tool name or result —
 * `roadmap`, `timetable`, `bid`, `course` (plus `professor`/`review`, which
 * the course catalog tools traffic in). A turn with no recognizable root
 * falls back to all four routers, preserving the old behavior for
 * unrecognized tools.
 */
export function useRefreshAfterTools(
  status: "submitted" | "streaming" | "ready" | "error",
  messages: UIMessage[] = [],
) {
  const utils = api.useUtils();
  const prev = useRef(status);

  useEffect(() => {
    const wasRunning =
      prev.current === "streaming" || prev.current === "submitted";
    const running = status === "streaming" || status === "submitted";
    prev.current = status;
    if (!wasRunning || running) return;

    const targets = refreshTargets(messages);
    const jobs: Array<Promise<unknown>> = [];
    if (targets.roadmaps) jobs.push(utils.roadmaps.invalidate());
    if (targets.timetable) jobs.push(utils.timetable.invalidate());
    if (targets.userBids) jobs.push(utils.userBids.invalidate());
    if (targets.courses) jobs.push(utils.courses.invalidate());
    void Promise.allSettled(jobs);
  }, [status, messages, utils]);
}

export type RefreshTargets = {
  roadmaps: boolean;
  timetable: boolean;
  userBids: boolean;
  courses: boolean;
};

const ROUTER_HINTS: Array<{ roots: RegExp; target: keyof RefreshTargets }> = [
  { roots: /roadmap/i, target: "roadmaps" },
  { roots: /timetable/i, target: "timetable" },
  { roots: /bid/i, target: "userBids" },
  { roots: /course|professor|review/i, target: "courses" },
];

/**
 * Map a completed turn's tool parts to the tRPC routers they touch. Exported
 * for unit tests: the hook itself only calls this on the run-end transition.
 */
export function refreshTargets(messages: UIMessage[]): RefreshTargets {
  const haystacks: string[] = [];
  for (const m of messages) {
    if (!Array.isArray(m.parts)) continue;
    for (const part of m.parts) {
      if (part.type !== "dynamic-tool" && !part.type.startsWith("tool-"))
        continue;
      const toolPart = part as ToolPart;
      // Tool name first (e.g. "upsert-roadmap-entry"); then the result text,
      // which carries naming roots too (course codes, timetable/roadmap/bid
      // ids) when the name alone is generic.
      haystacks.push(toolLabel(toolPart));
      if ("output" in toolPart && toolPart.output !== undefined) {
        try {
          haystacks.push(JSON.stringify(toolPart.output));
        } catch {
          // Circular BigInt-style payloads are uninspectable — the name
          // haystack above still applies.
        }
      }
    }
  }
  const hits: RefreshTargets = {
    roadmaps: false,
    timetable: false,
    userBids: false,
    courses: false,
  };
  for (const h of haystacks) {
    for (const { roots, target } of ROUTER_HINTS) {
      if (roots.test(h)) hits[target] = true;
    }
  }
  // Unrecognized turn (no tool parts, or none matching a root): keep the old
  // invalidate-everything behavior rather than silently refreshing nothing.
  if (!hits.roadmaps && !hits.timetable && !hits.userBids && !hits.courses) {
    return { roadmaps: true, timetable: true, userBids: true, courses: true };
  }
  return hits;
}
