// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

configure({ testIdAttribute: "data-test" });

type Args = {
  entity: "course" | "professor";
  scope?: { professorSlug?: string; courseCode?: string };
  query: string;
};

const useSearchCatalogMock = vi.fn<(args: Args) => unknown>();

vi.mock("@/common/hooks/useSearchCatalog", () => ({
  useSearchCatalog: (args: Args) => useSearchCatalogMock(args),
}));

import { ReviewFormSection } from "./ReviewFormSection";
import { ReviewScopeProvider } from "./review-scope";

const COURSE_ROW = { id: "c-id-1", code: "IS216", name: "Web App Dev" };
const PROF_ROW = { id: "p-id-1", slug: "prof-goh", name: "Goh" };

function catalog(rows: unknown[]) {
  return {
    rows,
    total: rows.length,
    debouncedQuery: "",
    isFetching: false,
    isStale: false,
  };
}

function Harness({ children }: { children: ReactNode }) {
  const methods = useForm({
    defaultValues: {
      type: "professor",
      course: { value: "" },
      professor: { value: "" },
    },
  });
  return (
    <FormProvider {...(methods as never)}>
      <ReviewScopeProvider>{children}</ReviewScopeProvider>
    </FormProvider>
  );
}

function sections() {
  return (
    <Harness>
      <ReviewFormSection type="course" maxRating={5} reviewLabels={[]} />
      <ReviewFormSection type="professor" maxRating={5} reviewLabels={[]} />
    </Harness>
  );
}

function lastCall(entity: "course" | "professor") {
  return useSearchCatalogMock.mock.calls
    .map(([args]) => args)
    .filter((args) => args.entity === entity)
    .at(-1);
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
  useSearchCatalogMock.mockReset();
  useSearchCatalogMock.mockImplementation((args) =>
    catalog(args.entity === "course" ? [COURSE_ROW] : [PROF_ROW]),
  );
});

describe("ReviewFormSection catalog scope (issue 324)", () => {
  it("searches both lists unscoped before anything is selected", () => {
    render(sections());

    expect(lastCall("course")?.scope).toBeUndefined();
    expect(lastCall("professor")?.scope).toBeUndefined();
  });

  it("scopes the professor list by the selected course code", async () => {
    const user = userEvent.setup();
    render(sections());

    await user.click(screen.getAllByTestId("combobox-trigger")[0]!);
    await user.click(screen.getByTestId("combobox-item-c-id-1"));

    expect(lastCall("professor")?.scope).toEqual({ courseCode: "IS216" });
    expect(lastCall("course")?.scope).toBeUndefined();
  });

  it("scopes the course list by the selected professor slug", async () => {
    const user = userEvent.setup();
    render(sections());

    await user.click(screen.getAllByTestId("combobox-trigger")[1]!);
    await user.click(screen.getByTestId("combobox-item-p-id-1"));

    expect(lastCall("course")?.scope).toEqual({ professorSlug: "prof-goh" });
    expect(lastCall("professor")?.scope).toBeUndefined();
  });

  it("drops the scope when the selection is cleared", async () => {
    const user = userEvent.setup();
    render(sections());

    await user.click(screen.getAllByTestId("combobox-trigger")[0]!);
    await user.click(screen.getByTestId("combobox-item-c-id-1"));
    await user.click(screen.getAllByTestId("combobox-trigger")[0]!);
    await user.click(screen.getByTestId("combobox-item-c-id-1"));

    expect(lastCall("professor")?.scope).toBeUndefined();
  });

  it("still searches unscoped when rendered outside the scope provider", () => {
    function Bare() {
      const methods = useForm({ defaultValues: { course: { value: "" } } });
      return (
        <FormProvider {...(methods as never)}>
          <ReviewFormSection type="course" maxRating={5} reviewLabels={[]} />
        </FormProvider>
      );
    }
    render(<Bare />);

    expect(lastCall("course")?.scope).toBeUndefined();
  });
});
