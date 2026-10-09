// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoadmapGrid } from "./RoadmapGrid";
import type { Entry } from "../functions/conflicts";

const mockEntry: Entry = {
  courseId: "course-1",
  courseCode: "CS101",
  courseName: "Introduction to Computer Science",
  creditUnits: 1,
  yearNumber: 1,
  term: "T1",
};

function renderGrid(onSave?: (entries: Entry[]) => Promise<void>) {
  return render(
    <RoadmapGrid
      roadmapId="r1"
      entries={[mockEntry]}
      onEntriesChange={vi.fn()}
      onSave={onSave}
    />,
  );
}

// Closing or reloading the tab does not unmount React, so the unmount flush
// cannot save an edit made in the last debounce window. The browser's own
// leave-page prompt is the only safety net there.
function leavePage(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("RoadmapGrid unsaved-edit guard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("asks the browser to confirm leaving while an edit is unsaved", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGrid(vi.fn().mockResolvedValue(undefined));

    expect(leavePage()).toBe(false);
    await user.click(
      screen.getByRole("button", { name: /Remove .+ from roadmap/ }),
    );

    expect(leavePage()).toBe(true);
  });

  it("stops asking once the edit is saved", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGrid(vi.fn().mockResolvedValue(undefined));
    await user.click(
      screen.getByRole("button", { name: /Remove .+ from roadmap/ }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(leavePage()).toBe(false);
  });

  it("keeps asking while the save keeps failing", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGrid(vi.fn().mockRejectedValue(new Error("offline")));
    await user.click(
      screen.getByRole("button", { name: /Remove .+ from roadmap/ }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(leavePage()).toBe(true);
  });

  it("removes the listener on unmount", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = renderGrid(vi.fn().mockResolvedValue(undefined));
    await user.click(
      screen.getByRole("button", { name: /Remove .+ from roadmap/ }),
    );

    unmount();

    expect(leavePage()).toBe(false);
  });
});
