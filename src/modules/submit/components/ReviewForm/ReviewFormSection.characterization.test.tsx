// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { configure, render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

configure({ testIdAttribute: "data-test" });

vi.mock("@/common/hooks/useSearchCatalog", () => ({
  useSearchCatalog: () => ({
    rows: [],
    total: 0,
    debouncedQuery: "",
    isFetching: false,
    isStale: false,
  }),
}));

import { ReviewFormSection } from "./ReviewFormSection";
import { ReviewScopeProvider } from "./review-scope";

type TestFormValues = {
  type?: string;
  course?: { value: string };
  professor?: { value: string };
};

function Harness({ children }: { children: ReactNode }) {
  const methods = useForm<TestFormValues>({
    defaultValues: {
      type: "course",
      course: { value: "" },
      professor: { value: "" },
    },
  });
  return (
    <FormProvider {...methods}>
      <ReviewScopeProvider>{children}</ReviewScopeProvider>
    </FormProvider>
  );
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
});

describe("ReviewFormSection text fields (characterization)", () => {
  it("renders the body and tips textareas with their labels", () => {
    render(
      <Harness>
        <ReviewFormSection type="course" maxRating={5} reviewLabels={[]} />
      </Harness>,
    );

    const bodyItem = screen.getByTestId(
      "review-form-course-body",
    ).parentElement;
    const tipsItem = screen.getByTestId(
      "review-form-course-tips",
    ).parentElement;

    expect(bodyItem?.outerHTML).toMatchInlineSnapshot(
      `"<div data-slot="form-item" class="grid w-full max-w-prose gap-2 md:gap-4"><label data-slot="form-label" class="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 data-[error=true]:text-destructive" data-error="false" for="_r_4_-form-item">What do you like about this course? *</label><textarea data-slot="form-control" class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full" placeholder="Start writing here" name="course.body" data-test="review-form-course-body" id="_r_4_-form-item" aria-describedby="_r_4_-form-item-description" aria-invalid="false"></textarea></div>"`,
    );
    expect(tipsItem?.outerHTML).toMatchInlineSnapshot(
      `"<div data-slot="form-item" class="grid w-full max-w-prose gap-2 md:gap-4"><label data-slot="form-label" class="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 data-[error=true]:text-destructive" data-error="false" for="_r_5_-form-item">Tips to excel in this course</label><textarea data-slot="form-control" class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full" placeholder="Start writing here" name="course.tips" data-test="review-form-course-tips" id="_r_5_-form-item" aria-describedby="_r_5_-form-item-description" aria-invalid="false"></textarea></div>"`,
    );
  });
});
