// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, createStore } from "jotai";

import { CourseSearchPanel } from "./CourseSearchPanel";
import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";

const m = vi.hoisted(() => ({
  useSearchCourses: vi.fn(),
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    timetable: {
      searchCourses: {
        useQuery: (...args: unknown[]) =>
          m.useSearchCourses(...(args as [])) as unknown,
      },
    },
  },
}));

// Bypass the 300ms debounce so typed text is immediately the searched query.
// The debounce itself is covered by `useDebouncedValue.test.ts`.
vi.mock("@/common/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: unknown) => v,
}));

// SectionPicker pulls in mutation hooks + atoms; the search panel renders it
// only for the expanded course, which these tests never expand. Stub it out
// so the test stays focused on the search states (empty / loading / results).
vi.mock("./SectionPicker", () => ({
  SectionPicker: () => null,
}));

/** Render the panel with a controllable term atom + controllable query stub. */
function renderPanel(termId: string | null) {
  const store = createStore();
  store.set(selectedTermIdAtom, termId);
  return render(
    <Provider store={store}>
      <CourseSearchPanel timetableCourseCodes={new Set()} />
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CourseSearchPanel search states", () => {
  it("shows the get-started hint — not loading skeletons — when nothing is typed", () => {
    // Disabled query: no fetch in flight, no data — the exact state the
    // tRPC hook returns before the user types (enabled: false leaves
    // `isPending` true while `isFetching` stays false).
    m.useSearchCourses.mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: false,
    });

    renderPanel("term-1");

    expect(
      screen.getByText(/type a course code, name or professor/i),
    ).toBeTruthy();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it("shows loading skeletons once a query is in flight", async () => {
    const user = userEvent.setup();
    m.useSearchCourses.mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: true,
    });

    renderPanel("term-1");

    await user.type(
      screen.getByPlaceholderText(/search code, name or professor/i),
      "IS4",
    );

    expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });

  it("shows the no-results hint — not skeletons — after a search resolves empty", async () => {
    const user = userEvent.setup();
    m.useSearchCourses.mockReturnValue({
      data: [],
      isPending: false,
      isFetching: false,
    });

    renderPanel("term-1");

    await user.type(
      screen.getByPlaceholderText(/search code, name or professor/i),
      "ZZZ",
    );

    expect(screen.getByText(/no courses found/i)).toBeTruthy();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });
});
