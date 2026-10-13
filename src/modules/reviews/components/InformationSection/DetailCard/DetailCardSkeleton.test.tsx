// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DetailCardSkeleton } from "./DetailCardSkeleton";

describe("DetailCardSkeleton", () => {
  it("renders the details heading above its skeleton rows", () => {
    const { container } = render(<DetailCardSkeleton />);
    expect(container.querySelector("h2")?.textContent).toBe("Details");
    expect(container.innerHTML).toMatchSnapshot();
  });
});
