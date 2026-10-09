import { describe, expect, it } from "vitest";

import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";
import { buildReviewSubmitBreadcrumb } from "./review-breadcrumb";

const SECRET_BODY = "secret-review-text ".repeat(15);

const input = {
  type: "professor",
  submitAs: "STUDENT",
  course: {
    value: "course-id-private",
    rating: 4,
    labels: ["a", "b"],
    body: SECRET_BODY,
    tips: "tip text",
  },
  professor: {
    value: "professor-id-private",
    rating: 5,
    labels: [],
    body: SECRET_BODY,
    tips: "",
  },
} as unknown as ReviewFormInputsSchema;

describe("buildReviewSubmitBreadcrumb", () => {
  it("carries lengths and counts only", () => {
    const breadcrumb = buildReviewSubmitBreadcrumb(input);
    const serialised = JSON.stringify(breadcrumb);

    expect(serialised).not.toContain("secret-review-text");
    expect(serialised).not.toContain("tip text");
    expect(serialised).not.toContain("private");
    expect(breadcrumb.data.course).toEqual({
      bodyLength: SECRET_BODY.length,
      tipsLength: 8,
      rating: 4,
      labelCount: 2,
    });
  });

  it("omits the professor block when the form has none", () => {
    const breadcrumb = buildReviewSubmitBreadcrumb({
      ...input,
      type: "course",
      professor: undefined,
    } as unknown as ReviewFormInputsSchema);

    expect(breadcrumb.data.professor).toBeUndefined();
  });
});
