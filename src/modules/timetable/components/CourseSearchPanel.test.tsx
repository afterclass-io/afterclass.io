// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";

const { mockTermsList } = vi.hoisted(() => ({
  mockTermsList: vi.fn(),
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    acadTerms: { list: { useQuery: mockTermsList } },
    timetable: {
      searchCourses: {
        useQuery: () => ({ data: undefined, isFetching: false }),
      },
    },
  },
}));
vi.mock("./SectionPicker", () => ({ SectionPicker: () => null }));

import { CourseSearchPanel } from "./CourseSearchPanel";

const renderPanel = (termId: string | null) => {
  const store = createStore();
  store.set(selectedTermIdAtom, termId);
  return render(
    <Provider store={store}>
      <CourseSearchPanel timetableCourseCodes={new Set()} />
    </Provider>,
  );
};

describe("CourseSearchPanel placeholder", () => {
  beforeEach(() => {
    mockTermsList.mockReset();
  });

  it("names the selected term", () => {
    mockTermsList.mockReturnValue({
      data: [{ id: "t1", label: "2026-27 Term 1" }],
    });
    renderPanel("t1");
    expect(
      screen.getByPlaceholderText("Search courses offered in 2026-27 Term 1"),
    ).toBeTruthy();
  });

  it("falls back to the field list while the term list is loading", () => {
    mockTermsList.mockReturnValue({ data: undefined });
    renderPanel("t1");
    expect(
      screen.getByPlaceholderText("Search code, name or professor…"),
    ).toBeTruthy();
  });
});
