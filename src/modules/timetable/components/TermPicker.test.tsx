// @vitest-environment jsdom
import type { ReadonlyURLSearchParams } from "next/navigation";
import { render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";

const mockTermsQuery = vi.fn<() => unknown>();
const mockCurrentWindowQuery = vi.fn<() => unknown>();
const mockCurrentTermQuery = vi.fn<() => unknown>();
const mockSearchParams = vi.fn<() => ReadonlyURLSearchParams>();

vi.mock("next/navigation", () => ({
  useSearchParams: (): ReadonlyURLSearchParams => mockSearchParams(),
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    acadTerms: {
      list: {
        useQuery: (): unknown => mockTermsQuery(),
      },
      current: {
        useQuery: (): unknown => mockCurrentTermQuery(),
      },
    },
    bidWindows: {
      getCurrentWindow: {
        useQuery: (): unknown => mockCurrentWindowQuery(),
      },
    },
  },
}));

import { TermPicker } from "./TermPicker";

describe("TermPicker", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    mockSearchParams.mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams,
    );
    mockCurrentTermQuery.mockReturnValue({
      data: null,
      isSuccess: true,
      isPending: false,
    });
  });

  it("renders skeleton while queries are loading", () => {
    mockTermsQuery.mockReturnValue({ isPending: true, data: undefined });
    mockCurrentWindowQuery.mockReturnValue({
      isPending: true,
      data: undefined,
    });

    const { container } = render(
      <Provider store={store}>
        <TermPicker />
      </Provider>,
    );

    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
  });

  it("includes and selects current window term when missing from termsQuery", async () => {
    // termsQuery only has older term AY202627T1
    mockTermsQuery.mockReturnValue({
      isPending: false,
      data: [
        {
          id: "AY202627T1",
          label: "AY2026/2027 1",
          startDt: new Date("2026-08-17T00:00:00.000Z"),
          endDt: new Date("2026-12-06T23:59:59.999Z"),
          acadYearStart: 2026,
          acadYearEnd: 2027,
          term: "1",
        },
      ],
    });

    // current bid window is window 170 for AY202627T2
    mockCurrentWindowQuery.mockReturnValue({
      isPending: false,
      isSuccess: true,
      data: {
        id: 170,
        acadTermId: "AY202627T2",
        acadTerm: {
          id: "AY202627T2",
          acadYearStart: 2026,
          acadYearEnd: 2027,
          term: "2",
          startDt: new Date("2026-10-28T02:00:00.000Z"),
          endDt: new Date("2027-05-02T23:59:59.999Z"),
        },
      },
    });

    render(
      <Provider store={store}>
        <TermPicker />
      </Provider>,
    );

    // selectedTermIdAtom should be auto-set to the upcoming bid term AY202627T2
    await waitFor(() => {
      expect(store.get(selectedTermIdAtom)).toBe("AY202627T2");
    });

    // Trigger should display the label rather than being blank
    expect(screen.getByText("AY2026/2027 2")).toBeTruthy();
  });

  it("prioritizes valid deep link term when present in terms list", async () => {
    mockSearchParams.mockReturnValue(
      new URLSearchParams(
        "acadTermId=AY202627T1",
      ) as unknown as ReadonlyURLSearchParams,
    );

    mockTermsQuery.mockReturnValue({
      isPending: false,
      data: [
        {
          id: "AY202627T1",
          label: "AY2026/2027 1",
          startDt: new Date("2026-08-17T00:00:00.000Z"),
          endDt: new Date("2026-12-06T23:59:59.999Z"),
          acadYearStart: 2026,
          acadYearEnd: 2027,
          term: "1",
        },
      ],
    });

    mockCurrentWindowQuery.mockReturnValue({
      isPending: false,
      isSuccess: true,
      data: {
        id: 170,
        acadTermId: "AY202627T2",
        acadTerm: {
          id: "AY202627T2",
          acadYearStart: 2026,
          acadYearEnd: 2027,
          term: "2",
          startDt: new Date("2026-10-28T02:00:00.000Z"),
          endDt: new Date("2027-05-02T23:59:59.999Z"),
        },
      },
    });

    render(
      <Provider store={store}>
        <TermPicker />
      </Provider>,
    );

    await waitFor(() => {
      expect(store.get(selectedTermIdAtom)).toBe("AY202627T1");
    });
    expect(screen.getByText("AY2026/2027 1")).toBeTruthy();
  });
});
