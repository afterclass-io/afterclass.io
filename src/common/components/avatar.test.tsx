// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const PHOTO = "https://lh3.googleusercontent.com/a/photo=s96-c";

function renderAvatar(src?: string | null) {
  return render(
    <Avatar className="size-6">
      <AvatarImage src={src} alt="" size={24} />
      <AvatarFallback>A</AvatarFallback>
    </Avatar>,
  );
}

describe("Avatar", () => {
  it("renders the image with explicit dimensions", () => {
    const { container } = renderAvatar(PHOTO);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("width")).toBe("24");
    expect(img?.getAttribute("height")).toBe("24");
  });

  it("serves the file through the Next.js image optimiser", () => {
    const { container } = renderAvatar(PHOTO);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("/_next/image");
    expect(decodeURIComponent(img?.getAttribute("src") ?? "")).toContain(PHOTO);
  });

  it("shows the initials until the image has loaded, then hides them", async () => {
    const { container } = renderAvatar(PHOTO);
    expect(screen.getByText("A")).toBeTruthy();
    fireEvent.load(container.querySelector("img")!);
    // next/image reports the load after the image decodes, so wait for it.
    await waitFor(() => expect(screen.queryByText("A")).toBeNull());
  });

  it("falls back to the initials when the image fails", () => {
    const { container } = renderAvatar(PHOTO);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("falls back to the initials when the student has no photo", () => {
    const { container } = renderAvatar(null);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("A")).toBeTruthy();
  });
});
