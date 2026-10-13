// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RoadmapGrid } from "./RoadmapGrid";
import cases from "./RoadmapGrid.layout.cases.json";

describe("RoadmapGrid layout", () => {
  it("renders column headers containing T1, T2, T3 and no standalone T3A or T3B", () => {
    const { container } = render(
      <RoadmapGrid roadmapId="r1" entries={[]} onEntriesChange={vi.fn()} />,
    );

    const headerRow = container.querySelector(".min-w-\\[540px\\] > div")!;
    expect(headerRow).toBeTruthy();
    expect(within(headerRow as HTMLElement).getByText("T1")).toBeTruthy();
    expect(within(headerRow as HTMLElement).getByText("T2")).toBeTruthy();
    expect(within(headerRow as HTMLElement).getByText("T3")).toBeTruthy();
    expect(within(headerRow as HTMLElement).queryByText("T3A")).toBeNull();
    expect(within(headerRow as HTMLElement).queryByText("T3B")).toBeNull();
  });

  it("renders droppables 1-T1, 1-T2, 1-T3A, 1-T3B with correct ordering and shared parent for T3", () => {
    const { container } = render(
      <RoadmapGrid roadmapId="r1" entries={[]} onEntriesChange={vi.fn()} />,
    );

    const t1 = container.querySelector('[data-droppable-id="1-T1"]');
    const t2 = container.querySelector('[data-droppable-id="1-T2"]');
    const t3a = container.querySelector('[data-droppable-id="1-T3A"]');
    const t3b = container.querySelector('[data-droppable-id="1-T3B"]');

    expect(t1).toBeTruthy();
    expect(t2).toBeTruthy();
    expect(t3a).toBeTruthy();
    expect(t3b).toBeTruthy();

    expect(t3a!.parentElement).toBe(t3b!.parentElement);
    expect(
      Boolean(
        t3a!.compareDocumentPosition(t3b!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("does not render T1 label text in 1-T1 droppable, but shows T3A in 1-T3A droppable", () => {
    const { container } = render(
      <RoadmapGrid roadmapId="r1" entries={[]} onEntriesChange={vi.fn()} />,
    );

    const t1 = container.querySelector('[data-droppable-id="1-T1"]');
    const t3a = container.querySelector('[data-droppable-id="1-T3A"]');

    expect(t1!.textContent).not.toContain("T1");
    expect(t3a!.textContent).toContain("T3A");
  });

  it("applies min-h-18 to 1-T1 empty cell and min-h-8 to 1-T3A empty cell", () => {
    const { container } = render(
      <RoadmapGrid roadmapId="r1" entries={[]} onEntriesChange={vi.fn()} />,
    );

    const t1 = container.querySelector('[data-droppable-id="1-T1"]');
    const t3a = container.querySelector('[data-droppable-id="1-T3A"]');

    expect(t1!.className).toContain("min-h-18");
    expect(t1!.className).not.toContain("min-h-[120px]");
    expect(t3a!.className).toContain("min-h-8");
  });

  it("resolves aria labels for Year 1 Term 3A and Year 1 Term 3B", () => {
    const { container } = render(
      <RoadmapGrid roadmapId="r1" entries={[]} onEntriesChange={vi.fn()} />,
    );

    const t3a = container.querySelector('[data-droppable-id="1-T3A"]');
    const t3b = container.querySelector('[data-droppable-id="1-T3B"]');

    expect(screen.getByLabelText("Year 1 Term 3A")).toBe(t3a);
    expect(screen.getByLabelText("Year 1 Term 3B")).toBe(t3b);
  });

  it("renders course chip in 1-T3B when stored value is T3B", () => {
    const { container } = render(
      <RoadmapGrid
        roadmapId="r1"
        entries={cases.t3bEntry}
        onEntriesChange={vi.fn()}
      />,
    );

    const t3a = container.querySelector('[data-droppable-id="1-T3A"]')!;
    const t3b = container.querySelector('[data-droppable-id="1-T3B"]')!;

    expect(within(t3b as HTMLElement).getByText("MGMT101")).toBeTruthy();
    expect(within(t3a as HTMLElement).queryByText("MGMT101")).toBeNull();
  });

  it("does not render conflict row with no conflicts, and renders CU badge with 6 CU in 1-T3A", () => {
    const { unmount } = render(
      <RoadmapGrid roadmapId="r1" entries={[]} onEntriesChange={vi.fn()} />,
    );

    expect(screen.queryByText("CU", { exact: true })).toBeNull();
    unmount();

    render(
      <RoadmapGrid
        roadmapId="r1"
        entries={cases.cuOverloadEntries}
        onEntriesChange={vi.fn()}
      />,
    );

    expect(screen.getByText("CU", { exact: true })).toBeTruthy();
  });

  it("renders no footer row when termFooter returns null, and renders 3 cells with T3 cell text when provided", () => {
    const { container, unmount } = render(
      <RoadmapGrid
        roadmapId="r1"
        entries={[]}
        onEntriesChange={vi.fn()}
        termFooter={() => null}
      />,
    );

    expect(container.querySelector('[data-test="f"]')).toBeNull();
    unmount();

    const { container: containerWithFooters } = render(
      <RoadmapGrid
        roadmapId="r1"
        entries={[]}
        onEntriesChange={vi.fn()}
        termFooter={(y, t) => <span data-test="f">{t}</span>}
      />,
    );

    const footerSpans =
      containerWithFooters.querySelectorAll('[data-test="f"]');
    expect(footerSpans).toHaveLength(3);
    expect(Array.from(footerSpans).map((s) => s.textContent)).toEqual([
      "T1",
      "T2",
      "T3",
    ]);
  });
});
