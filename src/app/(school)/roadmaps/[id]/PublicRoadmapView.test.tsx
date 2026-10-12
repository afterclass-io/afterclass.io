// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";
import {
  PublicRoadmapView,
  type PublicRoadmapViewProps,
} from "./PublicRoadmapView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    useUtils: () => ({ roadmaps: { listMine: { invalidate: vi.fn() } } }),
    roadmaps: {
      recordView: { useMutation: () => ({ mutate: vi.fn() }) },
      recordShare: { useMutation: () => ({ mutate: vi.fn() }) },
      copyPublic: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

vi.mock("@/modules/roadmaps/components/RoadmapVoteGroup", () => ({
  RoadmapVoteGroup: () => <div data-test="vote-group" />,
}));

vi.mock("@/modules/roadmaps/components/RoadmapReactionButton", () => ({
  RoadmapReactionButton: () => <div data-test="reaction-button" />,
}));

vi.mock("@/modules/roadmaps/components/RoadmapReactionsGroup", () => ({
  RoadmapReactionsGroup: () => <div data-test="reactions-group" />,
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

const baseProps: PublicRoadmapViewProps = {
  roadmapId: "rm-1",
  roadmapName: "CS Degree",
  description: "Four year plan",
  ownerUsername: "alice",
  ownerFaculty: { name: "School of Computing", acronym: "SOC" },
  publishedAt: "2026-01-15T00:00:00.000Z",
  viewCount: 1,
  shareCount: 3,
  voteCount: 2,
  viewerHasVoted: false,
  entries,
};

describe("PublicRoadmapView", () => {
  it("renders the header, author line, engagement counts and description", () => {
    render(<PublicRoadmapView {...baseProps} />);

    expect(screen.getByText("CS Degree")).toBeTruthy();
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("School of Computing (SOC)")).toBeTruthy();
    expect(
      screen.getByText(formatDateSGT(baseProps.publishedAt!)),
    ).toBeTruthy();
    expect(screen.getByText("1 view")).toBeTruthy();
    expect(screen.getByText("2 upvotes")).toBeTruthy();
    expect(screen.getByText("Four year plan")).toBeTruthy();
  });

  it("omits the faculty and date spans when the owner has none", () => {
    render(
      <PublicRoadmapView
        {...baseProps}
        ownerFaculty={null}
        publishedAt={null}
        description={null}
      />,
    );

    expect(screen.queryByText("School of Computing (SOC)")).toBeNull();
    expect(screen.queryByText(/Jan/)).toBeNull();
    expect(screen.queryByText("Four year plan")).toBeNull();
  });

  it("renders the back link, copy-link pill, copy button and the read-only grid", () => {
    const { container } = render(<PublicRoadmapView {...baseProps} />);

    const back = container.querySelector('a[href="/roadmaps"]');
    expect(back?.textContent).toBe("All roadmaps");

    const copyLink = container.querySelector('[data-test="roadmap-copy-link"]');
    expect(copyLink?.getAttribute("aria-label")).toBe(
      "Copy link to this roadmap",
    );
    expect(copyLink?.textContent).toBe("3");

    expect(
      screen.getByRole("button", { name: "Copy this roadmap" }),
    ).toBeTruthy();
    expect(container.querySelector('[data-test="report-button"]')).toBeTruthy();
    expect(screen.getByText("CS101")).toBeTruthy();
    expect(screen.getByText("MA101")).toBeTruthy();
    expect(container.querySelector('[data-test="timeline"]')).toBeNull();
    expect(container.querySelector('[data-droppable-id="1-T1"]')).toBeTruthy();
  });

  it("switches to the read-only timeline when the Timeline toggle is clicked", () => {
    const { container } = render(<PublicRoadmapView {...baseProps} />);

    fireEvent.click(screen.getByLabelText("Timeline View"));

    const timeline = container.querySelector('[data-test="timeline"]');
    expect(timeline?.getAttribute("data-count")).toBe("2");
    expect(timeline?.getAttribute("data-read-only")).toBe("true");
    expect(container.querySelector('[data-droppable-id="1-T1"]')).toBeNull();
  });

  it("matches the grid-view markup snapshot", () => {
    const { container } = render(<PublicRoadmapView {...baseProps} />);

    expect(container.innerHTML).toMatchSnapshot();
  });
});
