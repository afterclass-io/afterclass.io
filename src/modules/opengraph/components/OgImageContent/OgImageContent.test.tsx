// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OgImageContent } from "./OgImageContent";

const statItems = [
  { label: "Engaging", value: "33%" },
  { label: "Practical", value: "0%" },
];

describe("OgImageContent", () => {
  it("renders the course figures with the professor count", () => {
    const { container } = render(
      <OgImageContent
        rating="4.11"
        reviewCount={87}
        profCount={6}
        statItems={statItems}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders the professor figures with the course count", () => {
    const { container } = render(
      <OgImageContent
        rating="-"
        reviewCount={0}
        courseCount={2}
        statItems={[]}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
