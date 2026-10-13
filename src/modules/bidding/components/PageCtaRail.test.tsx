// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  it("renders the two CTA buttons", () => {
    const { container } = render(<PageCtaRail />);
    expect(dataTests(container)).toEqual([
      "cta-write-review",
      "cta-contribute-oss",
    ]);
    expect(
      screen
        .getByText("Contribute to AfterClass OSS")
        .closest("a")
        ?.getAttribute("target"),
    ).toBe("_blank");
  });

  it("places children after the buttons", () => {
    const { container } = render(
      <PageCtaRail>
        <div data-test="extra" />
      </PageCtaRail>,
    );
    expect(dataTests(container)).toEqual([
      "cta-write-review",
      "cta-contribute-oss",
      "extra",
    ]);
  });
});
