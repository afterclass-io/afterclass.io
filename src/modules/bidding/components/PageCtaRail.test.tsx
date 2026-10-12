// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/bidding/components/BidWindowScheduleCard", () => ({
  BidWindowScheduleCard: () => <div data-test="schedule-card" />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => null,
  useRouter: () => ({ push: vi.fn() }),
}));

// CtaButton navigates via ProgressLink, which needs the progress context.
vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

import { PageCtaRail } from "./PageCtaRail";

const dataTests = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[data-test]")).map((el) =>
    el.getAttribute("data-test"),
  );

describe("PageCtaRail", () => {
  it("renders the two CTA buttons then the schedule card", () => {
    const { container } = render(<PageCtaRail />);
    expect(dataTests(container)).toEqual([
      "cta-write-review",
      "cta-contribute-oss",
      "schedule-card",
    ]);
    expect(
      screen
        .getByText("Contribute to AfterClass OSS")
        .closest("a")
        ?.getAttribute("target"),
    ).toBe("_blank");
  });

  it("places children between the buttons and the schedule card", () => {
    const { container } = render(
      <PageCtaRail>
        <div data-test="extra" />
      </PageCtaRail>,
    );
    expect(dataTests(container)).toEqual([
      "cta-write-review",
      "cta-contribute-oss",
      "extra",
      "schedule-card",
    ]);
  });
});
