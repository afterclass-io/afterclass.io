// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { SearchResultContent } from "./SearchResultContent";

const m = vi.hoisted(() => ({
  intersections: new Map<string, (inView: boolean) => void>(),
  fetch:
    vi.fn<
      (entity: string, input: object, cursor: number) => Promise<unknown>
    >(),
}));
vi.mock("react-intersection-observer", () => ({
  InView: ({
    onChange,
    children,
    skip = false,
    "data-test": id = "search-sentinel",
  }: {
    onChange: (visible: boolean) => void;
    children: React.ReactNode;
    skip?: boolean;
    "data-test": string;
  }) => {
    useEffect(() => {
      if (skip) return;
      m.intersections.set(id, onChange);
      return () => {
        m.intersections.delete(id);
      };
    }, [id, onChange, skip]);
    return <div data-testid={id}>{children}</div>;
  },
}));
vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    search: {
      courseResults: {
        useInfiniteQuery: (input: object, options: object) =>
          useInfiniteQuery({
            getNextPageParam: () => undefined,
            ...options,
            queryKey: ["courses", input],
            initialPageParam: 0,
            queryFn: ({ pageParam }) => m.fetch("courses", input, pageParam),
            retry: false,
          }),
      },
      professorResults: {
        useInfiniteQuery: (input: object, options: object) =>
          useInfiniteQuery({
            getNextPageParam: () => undefined,
            ...options,
            queryKey: ["professors", input],
            initialPageParam: 0,
            queryFn: ({ pageParam }) => m.fetch("professors", input, pageParam),
            retry: false,
          }),
      },
    },
  },
}));
vi.mock("../SearchResultItem", () => ({
  SearchResultItem: ({ title, href }: { title: string; href: string }) => (
    <a href={href}>{title}</a>
  ),
}));

const course = {
  courseCode: "LAW108",
  courseName: "Singapore Legal System",
  uniAbbrv: "SMU" as const,
  profCount: 0,
  reviewCount: 0,
};
const professor = {
  profSlug: "tan",
  profName: "Tan",
  uniAbbrv: "SMU" as const,
  courseCount: 0,
  reviewCount: 0,
};
const props = {
  query: "Singapore",
  searchedCourse: [course],
  searchedProf: [professor],
  courseTotal: 2,
  profTotal: 1,
};
function setup(
  overrides: Partial<React.ComponentProps<typeof SearchResultContent>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    ...render(<SearchResultContent {...props} {...overrides} />, { wrapper }),
    client,
  };
}
afterEach(cleanup);
beforeEach(() => {
  m.fetch.mockReset();
  m.intersections.clear();
});
async function scroll() {
  await act(async () => {
    m.intersections.get("search-sentinel")?.(true);
  });
}
describe("paginated search", () => {
  it("loads on scroll and deduplicates overlapping rows", async () => {
    m.fetch.mockResolvedValue({
      rows: [
        course,
        { ...course, courseCode: "LAW109", courseName: "Singapore II" },
      ],
      total: 2,
      nextCursor: null,
    });
    setup();
    await scroll();
    expect(await screen.findByText("Singapore II")).toBeInTheDocument();
    expect(screen.getAllByText(course.courseName)).toHaveLength(1);
    expect(m.fetch).toHaveBeenCalledWith(
      "courses",
      { query: "Singapore", limit: 20 },
      1,
    );
    expect(
      screen.queryByRole("button", { name: "Load more results" }),
    ).not.toBeInTheDocument();
  });
  it("guards repeated intersections while a request is pending", async () => {
    let resolve!: (value: unknown) => void;
    m.fetch.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    setup();
    const intersect = m.intersections.get("search-sentinel")!;
    act(() => {
      intersect(true);
      intersect(true);
    });
    expect(m.fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ rows: [], total: 1, nextCursor: null }));
  });
  it("retains cards on failure and retries the same page", async () => {
    m.fetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      rows: [{ ...course, courseCode: "LAW109", courseName: "Singapore II" }],
      total: 2,
      nextCursor: null,
    });
    setup();
    await scroll();
    expect(screen.getByText(course.courseName)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Retry/ }));
    expect(await screen.findByText("Singapore II")).toBeInTheDocument();
    expect(m.fetch.mock.calls.map((call) => call[2])).toEqual([1, 1]);
  });
  it("keeps loaded cards when switching the existing type filter", async () => {
    m.fetch.mockResolvedValue({
      rows: [{ ...course, courseCode: "LAW109", courseName: "Singapore II" }],
      total: 2,
      nextCursor: null,
    });
    setup();
    await scroll();
    fireEvent.click(screen.getByText("Professor"));
    expect(screen.queryByText("Singapore II")).not.toBeInTheDocument();
    expect(screen.getByText("Tan")).toBeInTheDocument();
    fireEvent.click(screen.getByText("All"));
    expect(screen.getByText("Singapore II")).toBeInTheDocument();
    expect(m.fetch).toHaveBeenCalledTimes(1);
  });
  it("uses separate caches and resets on a new query", async () => {
    m.fetch.mockResolvedValue({
      rows: [{ ...course, courseCode: "LAW109", courseName: "Singapore II" }],
      total: 2,
      nextCursor: null,
    });
    const view = setup();
    await scroll();
    view.rerender(
      <SearchResultContent
        {...props}
        query="Economics"
        searchedCourse={[{ ...course, courseName: "Economics" }]}
        courseTotal={1}
      />,
    );
    expect(screen.queryByText("Singapore II")).not.toBeInTheDocument();
    expect(screen.getByText("Economics")).toBeInTheDocument();
  });
  it("retries an exhausted background refresh with refetch", async () => {
    const { client } = setup({
      courseTotal: 1,
      searchedProf: [],
      profTotal: 0,
    });
    m.fetch.mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["courses"] });
    });
    expect(screen.getByText(course.courseName)).toBeInTheDocument();
    m.fetch.mockResolvedValueOnce({
      rows: [course],
      total: 1,
      nextCursor: null,
    });
    fireEvent.click(await screen.findByRole("button", { name: /Retry/ }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Retry/ }),
      ).not.toBeInTheDocument(),
    );
    expect(m.fetch).toHaveBeenCalledTimes(2);
    expect(m.fetch.mock.calls.map((call) => call[2])).toEqual([0, 0]);
  });
  it("pauses the shared loader across filter changes during a failed load", async () => {
    let reject!: (reason: Error) => void;
    m.fetch.mockImplementationOnce(
      () =>
        new Promise((_resolve, r) => {
          reject = r;
        }),
    );
    setup({ profTotal: 2 });
    fireEvent.click(screen.getByText("Course"));
    act(() => {
      m.intersections.get("search-sentinel")!(true);
    });
    fireEvent.click(screen.getByText("Professor"));
    expect(m.intersections.has("search-sentinel")).toBe(false);
    await act(async () => {
      reject(new Error("offline"));
    });
    await waitFor(() =>
      expect(m.intersections.has("search-sentinel")).toBe(true),
    );
    m.fetch.mockResolvedValueOnce({
      rows: [{ ...professor, profSlug: "lee", profName: "Lee" }],
      total: 2,
      nextCursor: null,
    });
    await scroll();
    expect(await screen.findByText("Lee")).toBeInTheDocument();
  });
  it("shows the short-query hint without making requests", () => {
    setup({ query: "S" });
    expect(m.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(course.courseName)).not.toBeInTheDocument();
  });
  it("re-arms the scroll loader after a background refresh", async () => {
    m.fetch.mockImplementation(async (_entity, _input, cursor) =>
      cursor === 0 || cursor === undefined
        ? { rows: [course], total: 2, nextCursor: 1 }
        : {
            rows: [
              { ...course, courseCode: "LAW109", courseName: "Singapore II" },
            ],
            total: 2,
            nextCursor: null,
          },
    );
    const { client } = setup({ searchedProf: [], profTotal: 0 });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["courses"] });
    });
    await waitFor(() =>
      expect(m.intersections.has("search-sentinel")).toBe(true),
    );
    await scroll();
    expect(await screen.findByText("Singapore II")).toBeInTheDocument();
  });
});
