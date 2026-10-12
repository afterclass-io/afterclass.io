// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InformationCardSkeleton } from "./InformationCardSkeleton";

describe("InformationCardSkeleton", () => {
  it("renders the information heading above the description and button placeholders", () => {
    const { container } = render(<InformationCardSkeleton />);
    expect(container.querySelector("h2")?.textContent).toBe("Information");
    expect(container.innerHTML).toMatchSnapshot();
  });
});
