// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewShell } from "./view-shell";

describe("views/shared ViewShell", () => {
  it("pending renders the skeleton placeholder", () => {
    const { container } = render(
      <ViewShell status="pending" dark={false}>
        <span>body</span>
      </ViewShell>,
    );
    expect(
      container.querySelector("[aria-label='Loading']"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("body")).toBeNull();
  });

  it("pending renders a custom skeleton override when provided", () => {
    render(
      <ViewShell
        status="pending"
        dark={false}
        skeleton={<span>custom loading</span>}
      >
        <span>body</span>
      </ViewShell>,
    );
    expect(screen.getByText("custom loading")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("error renders the message in an alert", () => {
    render(
      <ViewShell status="error" dark={false} error={{ message: "boom" }}>
        <span>body</span>
      </ViewShell>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByText("body")).toBeNull();
  });

  it("ready renders children", () => {
    render(
      <ViewShell status="ready" dark={true}>
        <span>body</span>
      </ViewShell>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).toBeNull();
  });
});
