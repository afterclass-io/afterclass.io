// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";
import {
  SharedRoadmapView,
  type SharedRoadmapViewProps,
} from "./SharedRoadmapView";

const session = vi.hoisted(() => ({
  value: null as null | { user: { name: string } },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: session.value }),
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    useUtils: () => ({ roadmaps: { listMine: { invalidate: vi.fn() } } }),
    sharing: {
      copyShared: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

vi.mock("@/modules/moderation/components/ReportButton", () => ({
  ReportButton: () => <button data-test="report-button">Report</button>,
}));

vi.mock("@/modules/roadmaps/components/LazyRoadmapTimeline", () => ({
  LazyRoadmapTimeline: ({
    entries,
    readOnly,
  }: {
    entries: Entry[];
    readOnly?: boolean;
  }) => (
    <div
      data-test="timeline"
      data-count={entries.length}
      data-read-only={String(readOnly)}
    />
  ),
}));

const entries: Entry[] = [
  {
    courseId: "c1",
    courseCode: "CS101",
    courseName: "Intro to Computing",
    creditUnits: 4,
    yearNumber: 1,
    term: "T1",
  },
  {
    courseId: "c2",
    courseCode: "MA101",
    courseName: "Calculus",
    creditUnits: 4,
    yearNumber: 1,
    term: "T2",
  },
];

const baseProps: SharedRoadmapViewProps = {
  roadmapId: "rm-1",
  roadmapName: "CS Degree",
  ownerUsername: "alice",
  entries,
  token: "tok-1",
};

describe("SharedRoadmapView", () => {
  it("renders the shared header, back link and report button", () => {
    const { container } = render(<SharedRoadmapView {...baseProps} />);

    expect(screen.getByText("Shared Roadmap: CS Degree")).toBeTruthy();
    expect(screen.getByText("by alice")).toBeTruthy();
    expect(container.querySelector('a[href="/roadmaps"]')?.textContent).toBe(
      "All roadmaps",
    );
    expect(container.querySelector('[data-test="report-button"]')).toBeTruthy();
  });

  it("shows a login link instead of the copy button for guests", () => {
    session.value = null;
    const { container } = render(<SharedRoadmapView {...baseProps} />);

    const login = screen.getByRole("link", { name: "Log in to copy" });
    expect(login.getAttribute("href")).toBe(
      "/account/auth/login?callbackUrl=%2Fshare%2Froadmap%2Ftok-1",
    );
    expect(
      container.querySelector('[data-test="shared-roadmap-copy"]'),
    ).toBeNull();
  });

  it("shows the copy button for signed-in users and no login link", () => {
    session.value = { user: { name: "bob" } };
    const { container } = render(<SharedRoadmapView {...baseProps} />);

    const copy = container.querySelector('[data-test="shared-roadmap-copy"]');
    expect(copy?.textContent).toBe("Copy this roadmap");
    expect(screen.queryByText("Log in to copy")).toBeNull();
    session.value = null;
  });

  it("renders the read-only grid and switches to the timeline on toggle", () => {
    const { container } = render(<SharedRoadmapView {...baseProps} />);

    expect(screen.getByText("CS101")).toBeTruthy();
    expect(screen.getByText("MA101")).toBeTruthy();
    expect(container.querySelector('[data-test="timeline"]')).toBeNull();

    fireEvent.click(screen.getByLabelText("Timeline View"));

    const timeline = container.querySelector('[data-test="timeline"]');
    expect(timeline?.getAttribute("data-count")).toBe("2");
    expect(timeline?.getAttribute("data-read-only")).toBe("true");
  });

  it("matches the grid-view markup snapshot for a guest", () => {
    session.value = null;
    const { container } = render(<SharedRoadmapView {...baseProps} />);

    expect(container.innerHTML).toMatchSnapshot();
  });
});
