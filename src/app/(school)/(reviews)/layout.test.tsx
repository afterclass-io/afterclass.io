// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/bidding/components/BidWindowScheduleCard", () => ({
  BidWindowScheduleCard: () => <div />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => null,
  useRouter: () => ({ push: vi.fn() }),
}));

// CtaButton navigates via ProgressLink, which needs the progress context.
vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({
    start: vi.fn(),
    done: vi.fn(),
  }),
}));

import ReviewLayout from "./layout";

describe("ReviewLayout", () => {
  it("pins the reviews column to content height instead of stretching to the rail", () => {
    render(
      <ReviewLayout
        header={<div>header</div>}
        rating={<div>rating</div>}
        filter={<div>filter</div>}
        information={<div>info</div>}
        reviews={<div>one short review</div>}
      />,
    );
    // The row holding the reviews column + rail must not stretch flex
    // children: a short reviews list next to the tall rail would otherwise
    // leave a humongous empty area inside the reviews card.
    const slot = screen.getByText("one short review");
    const row = slot.parentElement!;
    expect(row.className).toMatch(/items-start/);
  });
});
