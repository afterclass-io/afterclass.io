// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncExternalStore } from "react";
import { SearchResultContent } from "./SearchResultContent";

const m = vi.hoisted(() => ({
  fetch:
    vi.fn<
      (entity: string, input: object, cursor: number) => Promise<unknown>
    >(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (listener) => {
        window.addEventListener("popstate", listener);
        return () => window.removeEventListener("popstate", listener);
      },
      () => window.location.search,
    );
    return new URLSearchParams(search);
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
  id: "c1",
  code: "LAW108",
  name: "The Singapore Legal System",
  uniAbbrv: "SMU" as const,
  creditUnits: 1,
  profCount: 0,
  reviewCount: 0,
};
const initialCourses = {
  rows: [course],
  totals: { matches: 3, related: 1 },
  nextCursor: 1,
};
const initialProfessors = {
  rows: [],
  totals: { matches: 0, related: 1 },
  nextCursor: null,
};

function setup(
  overrides: Partial<React.ComponentProps<typeof SearchResultContent>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <SearchResultContent
      query="Singapore"
      initialCourses={initialCourses}
      initialProfessors={initialProfessors}
      {...overrides}
    />,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
}

describe("complete search results UI", () => {
  beforeEach(() => {
    m.fetch.mockReset();
    window.history.replaceState(null, "", "/search?q=Singapore");
    const pushState = window.history.pushState.bind(window.history);
    vi.spyOn(window.history, "pushState").mockImplementation((...args) => {
      pushState(...args);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders totals, defers related requests and appends without duplicates", async () => {
    m.fetch.mockResolvedValue({
      rows: [
        course,
        { ...course, id: "c2", code: "LAW109", name: "Singapore Politics" },
      ],
      totals: { matches: 3, related: 1 },
      nextCursor: null,
    });
    setup();
    expect(screen.getByText("Showing 1 of 3 courses")).toBeInTheDocument();
    expect(m.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Load more courses" }));
    await screen.findByText("Singapore Politics");
    expect(screen.getAllByText(course.name)).toHaveLength(1);
    expect(screen.getByText("Showing 2 of 3 courses")).toBeInTheDocument();
    expect(m.fetch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Load more courses" }),
    ).not.toBeInTheDocument();
  });

  it("prevents concurrent loads and preserves cards with a retry after failure", async () => {
    let reject: (reason: Error) => void = () => undefined;
    m.fetch.mockImplementationOnce(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    );
    setup();
    const button = screen.getByRole("button", { name: "Load more courses" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    reject(new Error("Network failed"));
    await screen.findByRole("button", { name: "Retry courses" });
    expect(screen.getByText(course.name)).toBeInTheDocument();
    m.fetch.mockResolvedValue({
      rows: [{ ...course, id: "c2", name: "Singapore Politics" }],
      totals: initialCourses.totals,
      nextCursor: null,
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry courses" }));
    await screen.findByText("Singapore Politics");
  });

  it("loads fuzzy matches only on expansion and keeps them in a separate section", async () => {
    m.fetch.mockImplementation((entity) =>
      Promise.resolve({
        rows:
          entity === "professors"
            ? [
                {
                  id: "p1",
                  name: "Sing",
                  slug: "sing",
                  uniAbbrv: "SMU",
                  courseCount: 0,
                  reviewCount: 0,
                },
              ]
            : [],
        totals: { matches: 0, related: 1 },
        nextCursor: null,
      }),
    );
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Related matches/ }));
    await screen.findByText("Sing");
    expect(m.fetch).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(
        "These results have similar wording and may not contain your keyword.",
      ),
    ).toBeInTheDocument();
  });

  it("updates the type URL, retains batches and automatically expands related-only results", async () => {
    m.fetch.mockResolvedValue({
      rows: [],
      totals: initialProfessors.totals,
      nextCursor: null,
    });
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Toggle Professor" }));
    expect(window.location.search).toContain("type=professor");
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(course.name)).not.toBeInTheDocument();
    expect(screen.queryByText(/No results for/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Toggle Course" }));
    expect(screen.getByText(course.name)).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 3 courses")).toBeInTheDocument();
  });

  it("renders short and truly empty states without fetching", () => {
    const empty = {
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    };
    const view = setup({
      query: "i",
      initialCourses: empty,
      initialProfessors: empty,
    });
    expect(screen.getByText("Type 2 or more characters.")).toBeInTheDocument();
    expect(m.fetch).not.toHaveBeenCalled();
    view.unmount();
    setup({
      query: "Unknown",
      initialCourses: empty,
      initialProfessors: empty,
    });
    expect(screen.getByText("No results for “Unknown”.")).toBeInTheDocument();
  });

  it("isolates a changed query from an older request still in flight", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    m.fetch.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const view = setup();
    fireEvent.click(screen.getByRole("button", { name: "Load more courses" }));
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    const next = {
      rows: [{ ...course, id: "new", name: "Accounting" }],
      totals: { matches: 1, related: 0 },
      nextCursor: null,
    };
    view.rerender(
      <SearchResultContent
        query="Accounting"
        initialCourses={next}
        initialProfessors={{
          ...initialProfessors,
          totals: { matches: 0, related: 0 },
        }}
      />,
    );
    expect(screen.getByText("Accounting")).toBeInTheDocument();
    resolve({
      ...initialCourses,
      rows: [{ ...course, id: "old", name: "Old Singapore result" }],
      nextCursor: null,
    });
    await waitFor(() =>
      expect(
        screen.queryByText("Old Singapore result"),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(course.name)).not.toBeInTheDocument();
  });

  it("retains appended batches across type changes", async () => {
    m.fetch.mockResolvedValue({
      ...initialCourses,
      rows: [{ ...course, id: "c2", name: "Singapore Politics" }],
      nextCursor: null,
    });
    setup({
      initialProfessors: {
        ...initialProfessors,
        totals: { matches: 0, related: 0 },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load more courses" }));
    await screen.findByText("Singapore Politics");
    fireEvent.click(screen.getByRole("radio", { name: "Toggle Professor" }));
    expect(screen.queryByText("Singapore Politics")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Toggle Course" }));
    expect(screen.getByText("Singapore Politics")).toBeInTheDocument();
    expect(m.fetch).toHaveBeenCalledTimes(1);
  });

  it("allows collapsing automatically expanded related matches", async () => {
    m.fetch.mockResolvedValue({
      rows: [],
      totals: initialProfessors.totals,
      nextCursor: null,
    });
    setup({
      initialCourses: {
        rows: [],
        totals: { matches: 0, related: 0 },
        nextCursor: null,
      },
    });
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    const button = screen.getByRole("button", { name: /Related matches/ });
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
