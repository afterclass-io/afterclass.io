// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { viewStatusFallback } from "./view-shell";

describe("views/shared viewStatusFallback", () => {
  it("returns null once ready", () => {
    expect(viewStatusFallback({ status: "ready", dark: false })).toBeNull();
  });

  it("pending renders the shared skeleton", () => {
    const { container } = render(
      <>{viewStatusFallback({ status: "pending", dark: false })}</>,
    );
    expect(
      container.querySelector("[aria-label='Loading']"),
    ).toBeInTheDocument();
  });

  it("error renders the message in an alert with the card chrome", () => {
    render(
      <>
        {viewStatusFallback({
          status: "error",
          dark: true,
          error: { message: "boom" },
        })}
      </>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("boom");
    expect(alert.style.padding).toBe("16px");
  });

  it("error without a message falls back to the generic text", () => {
    render(<>{viewStatusFallback({ status: "error", dark: false })}</>);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong.",
    );
  });
});
