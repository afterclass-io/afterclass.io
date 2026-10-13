// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReactionPickerButton } from "./reaction-picker-button";

describe("ReactionPickerButton", () => {
  it("renders an accessible trigger tagged with the given umami event", () => {
    render(
      <ReactionPickerButton umamiEvent="review-react" onSelect={vi.fn()} />,
    );
    const trigger = screen.getByRole("button", { name: "React" });
    expect(trigger.getAttribute("data-umami-event")).toBe("review-react");
  });
});
