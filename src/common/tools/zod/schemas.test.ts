import { describe, expect, it } from "vitest";

import { ReviewableEnum, ReviewerEnum } from "@/modules/submit/types";
import { emailValidationSchema, reviewFormSchema } from "./schemas";

describe("emailValidationSchema", () => {
  it("rejects domains that only match as a suffix without a dot boundary", () => {
    expect(emailValidationSchema.safeParse("a@evilsmu.edu.sg").success).toBe(
      false,
    );
    expect(
      emailValidationSchema.safeParse("a@attacker-smu.edu.sg").success,
    ).toBe(false);
  });

  it("accepts exact domain and subdomains on host boundary", () => {
    expect(emailValidationSchema.safeParse("a@smu.edu.sg").success).toBe(true);
    expect(emailValidationSchema.safeParse("a@scis.smu.edu.sg").success).toBe(
      true,
    );
  });
});

describe("reviewFormSchema", () => {
  const validReview = {
    type: ReviewableEnum.COURSE,
    submitAs: ReviewerEnum.USER,
    course: {
      value: "course-1",
      rating: 4,
      body: "a".repeat(200),
      tips: "tips",
      labels: ["1", "2"],
    },
    professor: {},
  };

  it("accepts valid review payload", () => {
    expect(reviewFormSchema.safeParse(validReview).success).toBe(true);
  });

  it("rejects value exceeding 100 characters", () => {
    const invalid = {
      ...validReview,
      course: { ...validReview.course, value: "a".repeat(101) },
    };
    expect(reviewFormSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects body exceeding 5000 characters", () => {
    const invalid = {
      ...validReview,
      course: { ...validReview.course, body: "a".repeat(5001) },
    };
    expect(reviewFormSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects tips exceeding 2000 characters", () => {
    const invalid = {
      ...validReview,
      course: { ...validReview.course, tips: "a".repeat(2001) },
    };
    expect(reviewFormSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects more than 20 labels", () => {
    const invalid = {
      ...validReview,
      course: {
        ...validReview.course,
        labels: Array.from({ length: 21 }, (_, i) => String(i + 1)),
      },
    };
    expect(reviewFormSchema.safeParse(invalid).success).toBe(false);
  });

  it.each([["not-a-number"], ["0"], ["99999999999"], ["-1"], ["1.5"]])(
    "rejects invalid label %j",
    (label) => {
      const invalid = {
        ...validReview,
        course: { ...validReview.course, labels: [label] },
      };
      expect(reviewFormSchema.safeParse(invalid).success).toBe(false);
    },
  );
});
