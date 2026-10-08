// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Tag } from "./tag";

describe("Tag warning contrast classes", () => {
  it("renders filled warning variant with text-warning-foreground and not text-white", () => {
    const { container } = render(
      <Tag color="warning" variant="filled" deletable={false}>
        x
      </Tag>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeDefined();
    expect(root.classList.contains("text-warning-foreground")).toBe(true);
    expect(root.classList.contains("text-white")).toBe(false);
  });

  it("renders outline warning variant with text-warning-text and not text-warning as a standalone token", () => {
    const { container } = render(
      <Tag color="warning" variant="outline" deletable={false}>
        x
      </Tag>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeDefined();
    expect(root.classList.contains("text-warning-text")).toBe(true);
    expect(root.classList.contains("text-warning")).toBe(false);
  });

  it("renders soft warning variant with text-warning-text and not text-warning as a standalone token", () => {
    const { container } = render(
      <Tag color="warning" variant="soft" deletable={false}>
        x
      </Tag>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeDefined();
    expect(root.classList.contains("text-warning-text")).toBe(true);
    expect(root.classList.contains("text-warning")).toBe(false);
  });
});
