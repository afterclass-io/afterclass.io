// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "./loading";

describe("ProfessorHeader loading", () => {
  it("renders the title skeleton with the school tag placeholder", () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('[data-test="page-title"]')).not.toBeNull();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });
});
