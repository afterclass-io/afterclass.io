// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";

import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    timetable: {
      searchCourses: {
        useQuery: () => ({ data: undefined, isFetching: false }),
      },
    },
  },
}));
vi.mock("./SectionPicker", () => ({ SectionPicker: () => null }));

import { CourseSearchPanel } from "./CourseSearchPanel";

const renderPanel = () => {
  const store = createStore();
  store.set(selectedTermIdAtom, "t1");
  return render(
    <Provider store={store}>
      <CourseSearchPanel timetableCourseCodes={new Set()} />
    </Provider>,
  );
};

describe("CourseSearchPanel short query", () => {
  it("asks for more characters after one letter, not 'no courses found'", () => {
    renderPanel();
    fireEvent.change(
      screen.getByPlaceholderText("Search code, name or professor…"),
      { target: { value: "i" } },
    );
    expect(screen.getByText("Type 2 or more characters.")).toBeTruthy();
    expect(screen.queryByText(/No courses found/)).toBeNull();
  });
});
