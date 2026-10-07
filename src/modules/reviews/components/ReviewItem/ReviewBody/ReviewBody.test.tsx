// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewType, UniversityAbbreviation } from "@/generated/prisma/enums";
import type { Review } from "@/modules/reviews/types";
import { ReviewBody } from "./ReviewBody";

const mockReview: Review = {
  id: "rv-1",
  body: "This professor is shit at teaching",
  tips: "Avoid this class",
  rating: 1,
  courseCode: "IS111",
  courseName: "Intro to Programming",
  username: "student1",
  likeCount: 2,
  countEventViews: 10,
  createdAt: Date.now(),
  reviewLabels: [],
  university: UniversityAbbreviation.SMU,
  reviewFor: ReviewType.PROFESSOR,
};

describe("ReviewBody", () => {
  it("renders blocked profanity in review body as asterisks", () => {
    render(<ReviewBody review={mockReview} />);
    expect(
      screen.getByText("This professor is **** at teaching"),
    ).toBeInTheDocument();
  });

  it("leaves clean review body text unchanged", () => {
    render(
      <ReviewBody
        review={{ ...mockReview, body: "Great professor and clear lectures" }}
      />,
    );
    expect(
      screen.getByText("Great professor and clear lectures"),
    ).toBeInTheDocument();
  });
});
