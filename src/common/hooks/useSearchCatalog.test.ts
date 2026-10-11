// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryOptions = {
  enabled?: boolean;
  placeholderData?: unknown;
  staleTime?: number;
};

type QueryInput = {
  query?: string;
  scope?: { professorSlug?: string; courseCode?: string };
  limit?: number;
};

type QueryResult = {
  data:
    | {
        rows: Array<{ id: string; code?: string; slug?: string; name: string }>;
        total: number;
      }
    | undefined;
  isFetching: boolean;
  isPlaceholderData: boolean;
};

const coursesUseQueryMock =
  vi.fn<(input: QueryInput, options?: QueryOptions) => QueryResult>();
const professorsUseQueryMock =
  vi.fn<(input: QueryInput, options?: QueryOptions) => QueryResult>();

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    search: {
      courses: {
        useQuery: (input: QueryInput, options?: QueryOptions) =>
          coursesUseQueryMock(input, options),
      },
      professors: {
        useQuery: (input: QueryInput, options?: QueryOptions) =>
          professorsUseQueryMock(input, options),
      },
    },
  },
}));

import { useSearchCatalog } from "./useSearchCatalog";

beforeEach(() => {
  vi.useFakeTimers();
  coursesUseQueryMock.mockReset();
  professorsUseQueryMock.mockReset();

  coursesUseQueryMock.mockImplementation((_input, options) => ({
    data: options?.enabled ? { rows: [], total: 0 } : undefined,
    isFetching: false,
    isPlaceholderData: false,
  }));
  professorsUseQueryMock.mockImplementation((_input, options) => ({
    data: options?.enabled ? { rows: [], total: 0 } : undefined,
    isFetching: false,
    isPlaceholderData: false,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSearchCatalog", () => {
  it("with query: 'ab', no request starts before 299 ms and one request starts at 300 ms", () => {
    const { rerender } = renderHook(
      ({ query }: { query: string }) =>
        useSearchCatalog({ entity: "course", query }),
      { initialProps: { query: "" } },
    );

    expect(coursesUseQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );

    rerender({ query: "ab" });

    void act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(coursesUseQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );

    void act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(coursesUseQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "ab" }),
      expect.objectContaining({ enabled: true }),
    );
  });

  it("changing the query to 'abc' keeps earlier rows while the new request runs and marks isStale true", () => {
    const initialRows = [{ id: "c1", code: "IS216", name: "Software Eng" }];

    coursesUseQueryMock.mockImplementation((input, options) => {
      if (!options?.enabled) {
        return { data: undefined, isFetching: false, isPlaceholderData: false };
      }
      if (input.query === "ab") {
        return {
          data: { rows: initialRows, total: 1 },
          isFetching: false,
          isPlaceholderData: false,
        };
      }
      return {
        data: { rows: initialRows, total: 1 },
        isFetching: true,
        isPlaceholderData: true,
      };
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useSearchCatalog({ entity: "course", query }),
      { initialProps: { query: "" } },
    );

    rerender({ query: "ab" });
    void act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.rows).toEqual(initialRows);
    expect(result.current.isStale).toBe(false);

    rerender({ query: "abc" });

    // Immediately after query changes to 'abc', debounce has not fired, earlier rows kept, isStale is true
    expect(result.current.rows).toEqual(initialRows);
    expect(result.current.isStale).toBe(true);

    // After debounce fires at 300 ms, new request is running with isPlaceholderData: true
    void act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.rows).toEqual(initialRows);
    expect(result.current.isStale).toBe(true);

    // Once new data arrives
    const newRows = [{ id: "c2", code: "IS216A", name: "Adv Software Eng" }];
    coursesUseQueryMock.mockImplementation((input, options) => ({
      data: options?.enabled ? { rows: newRows, total: 1 } : undefined,
      isFetching: false,
      isPlaceholderData: false,
    }));

    rerender({ query: "abc" });
    expect(result.current.rows).toEqual(newRows);
    expect(result.current.isStale).toBe(false);
  });

  it("with query: 'a' and no scope, no request starts", () => {
    renderHook(() => useSearchCatalog({ entity: "course", query: "a" }));

    void act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(coursesUseQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
  });

  it("with query: '' and a scope, a request starts", () => {
    renderHook(() =>
      useSearchCatalog({
        entity: "course",
        query: "",
        scope: { professorSlug: "prof-slug" },
      }),
    );

    void act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(coursesUseQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: { professorSlug: "prof-slug" } }),
      expect.objectContaining({ enabled: true }),
    );
  });

  it("with enabled: false, starts no request", () => {
    renderHook(() =>
      useSearchCatalog({
        entity: "course",
        query: "software",
        enabled: false,
      }),
    );

    void act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(coursesUseQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
  });

  it("isIdle is true for 0 and 1 characters and false with a scope", () => {
    const { result, rerender } = renderHook(
      ({ query, scoped }: { query: string; scoped: boolean }) =>
        useSearchCatalog({
          entity: "course",
          query,
          scope: scoped ? { professorSlug: "prof-slug" } : undefined,
        }),
      { initialProps: { query: "", scoped: false } },
    );

    void act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isIdle).toBe(true);

    rerender({ query: "a", scoped: false });
    void act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isIdle).toBe(true);

    rerender({ query: "", scoped: true });
    void act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isIdle).toBe(false);
  });

  it("returns no rows once the query shrinks from 3 characters to 1", () => {
    const rows = [{ id: "c1", code: "IS216", name: "Software Eng" }];
    coursesUseQueryMock.mockImplementation(() => ({
      data: { rows, total: 1 },
      isFetching: false,
      isPlaceholderData: true,
    }));

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useSearchCatalog({ entity: "course", query }),
      { initialProps: { query: "abc" } },
    );
    void act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.rows).toEqual(rows);

    rerender({ query: "a" });
    void act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isIdle).toBe(true);
    expect(result.current.rows).toEqual([]);
  });
});
