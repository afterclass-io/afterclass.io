// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SchoolError from "./error";
import RatingError from "./(reviews)/@rating/error";
import ReviewsError from "./(reviews)/@reviews/error";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({ captureException }));

const boundaries = [
  ["(school)", SchoolError],
  ["@rating", RatingError],
  ["@reviews", ReviewsError],
] as const;

describe("(school) error boundaries", () => {
  afterEach(() => {
    cleanup();
    captureException.mockClear();
  });

  it.each(boundaries)(
    "%s reports the error and retries on click",
    (_name, Boundary) => {
      const error = new Error("boom");
      const retry = vi.fn();

      render(<Boundary error={error} retry={retry} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(captureException).toHaveBeenCalledWith(error);

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(retry).toHaveBeenCalledTimes(1);
    },
  );
});
