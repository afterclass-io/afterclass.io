// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

configure({ testIdAttribute: "data-test" });

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/bidding",
  useSearchParams: () => mockSearchParams,
}));

type SearchCatalogReturn = {
  rows: Array<{ id: string; code?: string; slug?: string; name: string }>;
  total: number;
  debouncedQuery: string;
  isFetching: boolean;
  isStale: boolean;
};

const useSearchCatalogMock =
  vi.fn<
    (args: {
      entity: "course" | "professor";
      scope?: unknown;
      query: string;
    }) => SearchCatalogReturn
  >();

vi.mock("@/common/hooks/useSearchCatalog", () => ({
  useSearchCatalog: (args: {
    entity: "course" | "professor";
    scope?: unknown;
    query: string;
  }) => useSearchCatalogMock(args),
}));

import { CourseProfessorFilter } from "./CourseProfessorFilter";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  }

  pushMock.mockReset();
  mockSearchParams = new URLSearchParams();
  useSearchCatalogMock.mockReset();

  useSearchCatalogMock.mockImplementation((args: { entity: string }) => {
    if (args.entity === "course") {
      return {
        rows: [{ id: "c1", code: "IS216", name: "Software Engineering" }],
        total: 1,
        debouncedQuery: "",
        isFetching: false,
        isStale: false,
      };
    }
    return {
      rows: [{ id: "p1", slug: "prof-goh", name: "Goh, Jing Rong" }],
      total: 1,
      debouncedQuery: "",
      isFetching: false,
      isStale: false,
    };
  });
});

describe("CourseProfessorFilter", () => {
  it("selecting a course calls router.push with ?course=IS216 and keeps other params", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("tab=history");

    render(
      <CourseProfessorFilter selectedCourse={null} selectedProfessor={null} />,
    );

    const triggers = screen.getAllByTestId("combobox-trigger");
    const courseTrigger = triggers[0]!;

    await user.click(courseTrigger);

    const item = screen.getByTestId("combobox-item-IS216");
    await user.click(item);

    expect(pushMock).toHaveBeenCalledWith("/bidding?tab=history&course=IS216");
  });

  it("deselecting removes the course key", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("course=IS216&tab=history");

    render(
      <CourseProfessorFilter
        selectedCourse={{ value: "IS216", label: "IS216 Software Engineering" }}
        selectedProfessor={null}
      />,
    );

    const triggers = screen.getAllByTestId("combobox-trigger");
    const courseTrigger = triggers[0]!;

    await user.click(courseTrigger);

    const item = screen.getByTestId("combobox-item-IS216");
    await user.click(item);

    expect(pushMock).toHaveBeenCalledWith("/bidding?tab=history");
  });

  it("with a selected course, the professor hook receives scope: { courseCode: 'IS216' }", () => {
    render(
      <CourseProfessorFilter
        selectedCourse={{ value: "IS216", label: "IS216 Software Engineering" }}
        selectedProfessor={null}
      />,
    );

    expect(useSearchCatalogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "professor",
        scope: { courseCode: "IS216" },
      }),
    );
  });

  it("with a selected professor, the course hook receives scope: { professorSlug: 'prof-goh' }", () => {
    render(
      <CourseProfessorFilter
        selectedCourse={null}
        selectedProfessor={{ value: "prof-goh", label: "Goh, Jing Rong" }}
      />,
    );

    expect(useSearchCatalogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "course",
        scope: { professorSlug: "prof-goh" },
      }),
    );
  });
});
