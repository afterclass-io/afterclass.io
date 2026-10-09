// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a sized box when it has no children", () => {
    const { container } = render(<Skeleton className="h-5 w-20" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-slot")).toBe("skeleton");
    expect(root.classList.contains("h-5")).toBe(true);
    expect(root.classList.contains("animate-pulse")).toBe(true);
  });

  it("keeps the children in the layout and hides them while loading", () => {
    const { container, getByText } = render(
      <Skeleton>
        <span>Real content</span>
      </Skeleton>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(root.classList.contains("*:invisible")).toBe(true);
    expect(getByText("Real content")).toBeDefined();
  });

  it("renders only the children when loading is false", () => {
    const { container, getByText } = render(
      <Skeleton loading={false}>
        <span>Real content</span>
      </Skeleton>,
    );
    expect(container.querySelector("[data-slot='skeleton']")).toBeNull();
    expect(getByText("Real content")).toBeDefined();
  });
});
