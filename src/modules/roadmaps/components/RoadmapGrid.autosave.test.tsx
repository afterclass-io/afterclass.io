// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoadmapGrid } from "./RoadmapGrid";
import type { Entry } from "../functions/conflicts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal entry for rendering a removable chip in the grid. */
const mockEntry: Entry = {
  courseId: "course-1",
  courseCode: "CS101",
  courseName: "Introduction to Computer Science",
  creditUnits: 1,
  yearNumber: 1,
  term: "T1",
};

/**
 * Render the grid with the real prop shape. The brief's minimal props are
 * adapted: `entries` must contain at least one entry so the remove (×)
 * affordance renders — clicking it is the real interaction that sets dirty.
 */
function renderGrid(onSave: (entries: Entry[]) => Promise<void> | void) {
  return render(
    <RoadmapGrid
      roadmapId="r1"
      entries={[mockEntry]}
      onEntriesChange={vi.fn()}
      onSave={onSave}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RoadmapGrid autosave", () => {
  beforeEach(() => {
    // Only fake Date + setTimeout/clearTimeout so the debounce is controlled.
    // dnd-kit internals need real requestAnimationFrame to function.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("flushes an unsaved edit on unmount even when the debounce has not fired", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = renderGrid(onSave);

    // Click the remove (×) button on the chip — this is the real interaction
    // the grid exposes that marks it dirty (handleRemoveEntry → setDirty(true)).
    await user.click(
      screen.getByRole("button", { name: /Remove .+ from roadmap/ }),
    );

    // Unmount BEFORE the 800ms debounce fires.
    unmount();

    // The flush-save on unmount must call onSave with the latest entries.
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("only clears dirty after a successful save", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = renderGrid(onSave);

    // First edit: remove the entry (marks dirty)
    await user.click(
      screen.getByRole("button", { name: /Remove .+ from roadmap/ }),
    );

    // Let the debounce fire — save rejects
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSave).toHaveBeenCalledTimes(1);

    // After a failed save, dirty must NOT be cleared — the next change
    // re-schedules and the unmount flush still fires onSave.
    unmount();
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
