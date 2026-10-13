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

describe("Skeleton accessibility", () => {
  it("hides bare placeholder text from assistive technology while loading", () => {
    const { container, queryByText } = render(<Skeleton>00%</Skeleton>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.textContent).toBe("00%");
    expect(queryByText("00%", { ignore: "[aria-hidden='true']" })).toBeNull();
  });

  it("does not hide the children once loading is false", () => {
    const { container } = render(<Skeleton loading={false}>00%</Skeleton>);
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
    expect(container.textContent).toBe("00%");
  });
});
