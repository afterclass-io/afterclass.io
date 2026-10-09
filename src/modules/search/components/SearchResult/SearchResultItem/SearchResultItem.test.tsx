// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UniversityAbbreviation } from "@/generated/prisma/enums";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated", data: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

import { SearchResultItem } from "./SearchResultItem";

describe("SearchResultItem", () => {
  it("renders one h3 for the title and no h1", () => {
    render(
      <SearchResultItem
        href="/course/IS215"
        school={UniversityAbbreviation.SMU}
        title="Digital Business Technology"
        subtitle="IS215"
        filterStats={[]}
      />,
    );

    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.tagName).toBe("H3");
    expect(headings[0]).toHaveTextContent("Digital Business Technology");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("renders the subtitle as plain text, not a heading", () => {
    render(
      <SearchResultItem
        href="/course/IS215"
        school={UniversityAbbreviation.SMU}
        title="Digital Business Technology"
        subtitle="IS215"
        filterStats={[]}
      />,
    );

    expect(screen.getByText("IS215").tagName).toBe("P");
  });

  it("truncates a long title so the subtitle keeps its width", () => {
    render(
      <SearchResultItem
        href="/course/IS215"
        school={UniversityAbbreviation.SMU}
        title="An extremely long course title that would otherwise push the chevron out of the card"
        subtitle="IS215"
        filterStats={[]}
      />,
    );

    expect(screen.getByRole("heading", { level: 3 })).toHaveClass(
      "min-w-0",
      "flex-1",
      "truncate",
    );
    expect(screen.getByText("IS215")).toHaveClass("shrink-0");
  });
});
