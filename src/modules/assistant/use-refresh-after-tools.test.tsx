// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

const invalidate = {
  roadmaps: { invalidate: vi.fn(async () => undefined) },
  timetable: { invalidate: vi.fn(async () => undefined) },
  userBids: { invalidate: vi.fn(async () => undefined) },
  courses: { invalidate: vi.fn(async () => undefined) },
};

vi.mock("@/common/tools/trpc/react", () => ({
  api: { useUtils: () => ({ ...invalidate }) },
}));

import {
  refreshTargets,
  useRefreshAfterTools,
} from "./use-refresh-after-tools";

const msg = (parts: UIMessage["parts"]): UIMessage => ({
  id: "m1",
  role: "assistant",
  parts,
});

const toolPart = (toolName: string, output?: unknown) => ({
  type: "dynamic-tool",
  toolName,
  toolCallId: "t1",
  state: "output-available",
  ...(output !== undefined ? { output } : {}),
});

function renderRefresh(messages: UIMessage[]) {
  type Props = {
    status: "submitted" | "streaming" | "ready" | "error";
    messages: UIMessage[];
  };
  return renderHook<void, Props>(
    ({ status, messages: m }) => useRefreshAfterTools(status, m),
    { initialProps: { status: "submitted", messages } },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshTargets", () => {
  it("maps a roadmap tool name to the roadmaps router only", () => {
    expect(
      refreshTargets([msg([toolPart("upsert-roadmap-entry") as never])]),
    ).toEqual({
      roadmaps: true,
      timetable: false,
      userBids: false,
      courses: false,
    });
  });

  it("maps a timetable tool name to the timetable router only", () => {
    expect(
      refreshTargets([msg([toolPart("add-class-to-timetable") as never])]),
    ).toEqual({
      roadmaps: false,
      timetable: true,
      userBids: false,
      courses: false,
    });
  });

  it("maps a bid tool name to the userBids router only", () => {
    expect(
      refreshTargets([
        msg([toolPart("upsert-bid", { classId: "cl1" }) as never]),
      ]),
    ).toEqual({
      roadmaps: false,
      timetable: false,
      userBids: true,
      courses: false,
    });
  });

  it("maps a course tool name to the courses router only", () => {
    expect(refreshTargets([msg([toolPart("search-course") as never])])).toEqual(
      {
        roadmaps: false,
        timetable: false,
        userBids: false,
        courses: true,
      },
    );
  });

  it("inspects the tool result when the name is generic", () => {
    // "recommend-bid-amount" already trips the bid root via its name; the
    // courseCode in the result additionally lights up the courses router.
    expect(
      refreshTargets([
        msg([
          toolPart("recommend-bid-amount", { courseCode: "ACCT102" }) as never,
        ]),
      ]),
    ).toEqual({
      roadmaps: false,
      timetable: false,
      userBids: true,
      courses: true,
    });
  });

  it("falls back to all four routers when nothing is recognized", () => {
    expect(refreshTargets([])).toEqual({
      roadmaps: true,
      timetable: true,
      userBids: true,
      courses: true,
    });
    expect(refreshTargets([msg([toolPart("get-me") as never])])).toEqual({
      roadmaps: true,
      timetable: true,
      userBids: true,
      courses: true,
    });
  });
});

describe("useRefreshAfterTools - narrowed invalidation (M12)", () => {
  it("invalidates only the matching router on run-end", () => {
    const messages = [msg([toolPart("upsert-roadmap-entry") as never])];
    const { rerender } = renderRefresh(messages);
    act(() => rerender({ status: "ready", messages }));
    expect(invalidate.roadmaps.invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate.timetable.invalidate).not.toHaveBeenCalled();
    expect(invalidate.userBids.invalidate).not.toHaveBeenCalled();
    expect(invalidate.courses.invalidate).not.toHaveBeenCalled();
  });

  it("invalidates everything when the turn is unrecognized", () => {
    const messages: UIMessage[] = [];
    const { rerender } = renderRefresh(messages);
    act(() => rerender({ status: "ready", messages }));
    expect(invalidate.roadmaps.invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate.timetable.invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate.userBids.invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate.courses.invalidate).toHaveBeenCalledTimes(1);
  });

  it("does not invalidate while the run is still going or on unrelated rerenders", () => {
    const messages = [msg([toolPart("save-roadmap-entries") as never])];
    const { rerender } = renderRefresh(messages);
    // Still running: no invalidation.
    act(() => rerender({ status: "streaming", messages }));
    expect(invalidate.roadmaps.invalidate).not.toHaveBeenCalled();
    // Run ends: exactly one invalidation.
    act(() => rerender({ status: "ready", messages }));
    expect(invalidate.roadmaps.invalidate).toHaveBeenCalledTimes(1);
    // Settled rerender: no repeat.
    act(() => rerender({ status: "ready", messages }));
    expect(invalidate.roadmaps.invalidate).toHaveBeenCalledTimes(1);
  });
});
