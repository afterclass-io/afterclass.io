// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("renders initials when there is no photoUrl", () => {
    const { container } = render(<UserAvatar photoUrl={null} fallback="A" />);
    expect(container.textContent).toBe("A");
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a 24px optimised image when a photoUrl exists", () => {
    const { container } = render(
      <UserAvatar photoUrl="https://lh3.googleusercontent.com/a/photo" fallback="A" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("width")).toBe("24");
    expect(img?.getAttribute("height")).toBe("24");
  });

  it("falls back to initials when the image fails", () => {
    const { container } = render(
      <UserAvatar photoUrl="https://lh3.googleusercontent.com/a/photo" fallback="A" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("A");
  });
});
