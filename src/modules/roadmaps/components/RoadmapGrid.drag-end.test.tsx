// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import type * as DndCore from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { RoadmapGrid } from "./RoadmapGrid";
import type { Entry } from "../functions/conflicts";

// Capture the DndContext onDragEnd handler so the drop logic can be driven
// directly. Children render without the sensor context, so only the handler
// is exercised here; the grid markup is unchanged.
const captured = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof DndCore>();
  return {
    ...actual,
    DndContext: (props: ComponentProps<typeof DndCore.DndContext>) => {
      captured.onDragEnd = (event) => props.onDragEnd?.(event);
      return <>{props.children}</>;
    },
  };
});

const entryA: Entry = {
  courseId: "c-a",
  courseCode: "CS101",
  courseName: "Intro A",
  creditUnits: 1,
  yearNumber: 1,
  term: "T1",
};

const entryB: Entry = {
  courseId: "c-b",
  courseCode: "CS102",
  courseName: "Intro B",
  creditUnits: 1,
  yearNumber: 1,
  term: "T2",
};

type FakeNode = {
  id: string;
  data: { current: Record<string, unknown> | undefined };
};

function fireDragEnd(active: FakeNode, over: FakeNode | null) {
  act(() => {
    captured.onDragEnd?.({ active, over } as DragEndEvent);
  });
}

function renderGrid(onEntriesChange: (entries: Entry[]) => void) {
  return render(
    <RoadmapGrid
      roadmapId="r1"
      entries={[entryA, entryB]}
      onEntriesChange={onEntriesChange}
    />,
  );
}

describe("RoadmapGrid drag end", () => {
  afterEach(() => {
    cleanup();
  });

  it("moves a grid entry into the term cell it is dropped on", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      { id: "c-a", data: { current: undefined } },
      {
        id: "term-cell-2-T3",
        data: {
          current: { type: "term-cell", yearNumber: 2, term: "T3" },
        },
      },
    );

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    expect(onEntriesChange).toHaveBeenCalledWith([
      { ...entryA, yearNumber: 2, term: "T3" },
      entryB,
    ]);
  });

  it("moves a grid entry into the term of the entry it is dropped on", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      { id: "c-a", data: { current: undefined } },
      { id: "c-b", data: { current: undefined } },
    );

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    expect(onEntriesChange).toHaveBeenCalledWith([
      { ...entryA, yearNumber: 1, term: "T2" },
      entryB,
    ]);
  });

  it("ignores a grid drop onto a target that is neither a term cell nor an entry", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      { id: "c-a", data: { current: undefined } },
      { id: "unknown", data: { current: undefined } },
    );

    expect(onEntriesChange).not.toHaveBeenCalled();
  });

  it("adds a sidebar course on a term-cell drop", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      {
        id: "sidebar-c-c",
        data: {
          current: {
            type: "sidebar-course",
            course: {
              id: "c-c",
              code: "CS103",
              name: "Intro C",
              creditUnits: 1,
            },
          },
        },
      },
      {
        id: "term-cell-2-T1",
        data: {
          current: { type: "term-cell", yearNumber: 2, term: "T1" },
        },
      },
    );

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    expect(onEntriesChange).toHaveBeenCalledWith([
      entryA,
      entryB,
      {
        courseId: "c-c",
        courseCode: "CS103",
        courseName: "Intro C",
        creditUnits: 1,
        yearNumber: 2,
        term: "T1",
      },
    ]);
  });

  it("adds a sidebar course onto an entry's term", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      {
        id: "sidebar-c-c",
        data: {
          current: {
            type: "sidebar-course",
            course: {
              id: "c-c",
              code: "CS103",
              name: "Intro C",
              creditUnits: 1,
            },
          },
        },
      },
      { id: "c-b", data: { current: undefined } },
    );

    expect(onEntriesChange).toHaveBeenCalledWith([
      entryA,
      entryB,
      {
        courseId: "c-c",
        courseCode: "CS103",
        courseName: "Intro C",
        creditUnits: 1,
        yearNumber: 1,
        term: "T2",
      },
    ]);
  });

  it("rejects a sidebar course that is already in the roadmap", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      {
        id: "sidebar-c-a",
        data: {
          current: {
            type: "sidebar-course",
            course: {
              id: "c-a",
              code: "CS101",
              name: "Intro A",
              creditUnits: 1,
            },
          },
        },
      },
      {
        id: "term-cell-2-T1",
        data: {
          current: { type: "term-cell", yearNumber: 2, term: "T1" },
        },
      },
    );

    expect(onEntriesChange).not.toHaveBeenCalled();
  });

  it("treats a sidebar drop on the cancel zone as a no-op", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd(
      {
        id: "sidebar-c-c",
        data: {
          current: {
            type: "sidebar-course",
            course: {
              id: "c-c",
              code: "CS103",
              name: "Intro C",
              creditUnits: 1,
            },
          },
        },
      },
      {
        id: "sidebar-cancel",
        data: { current: { type: "sidebar-cancel" } },
      },
    );

    expect(onEntriesChange).not.toHaveBeenCalled();
  });

  it("treats a drop outside any droppable as a no-op", () => {
    const onEntriesChange = vi.fn();
    renderGrid(onEntriesChange);

    fireDragEnd({ id: "c-a", data: { current: undefined } }, null);

    expect(onEntriesChange).not.toHaveBeenCalled();
  });
});
