// @vitest-environment jsdom
import { configure, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The launcher uses `data-test` (not `data-testid`), so teach testing-library
// to resolve `getByTestId` against it. Scoped to this file only.
configure({ testIdAttribute: "data-test" });

// next/link renders a plain anchor under jsdom - mock it to keep navigation inert.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { AssistantWidget } from "./assistant-widget";

beforeEach(() => {
  window.localStorage.clear();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

function renderWidget(open: boolean, onOpenChange = vi.fn()) {
  render(
    <AssistantWidget open={open} onOpenChange={onOpenChange}>
      <div>panel content</div>
    </AssistantWidget>,
  );
  return onOpenChange;
}

describe("AssistantWidget", () => {
  it("places the launcher at the bottom-right of the viewport", () => {
    // jsdom default viewport is 1024x768.
    renderWidget(false);
    const launcher = screen.getByTestId("assistant-widget-launcher");
    expect(launcher.style.left).toBe(`${1024 - 56 - 16}px`);
    expect(launcher.style.top).toBe(`${768 - 56 - 16}px`);
  });

  it("opens the box anchored with its bottom-right at the launcher", () => {
    renderWidget(true);
    const dialog = screen.getByRole("dialog", { name: "AfterClass assistant" });
    // Box (400x560) bottom-right = launcher bottom-right = (1024-16, 768-16).
    expect(dialog.style.left).toBe(`${1024 - 56 - 16 + 56 - 400}px`);
    expect(dialog.style.top).toBe(`${768 - 56 - 16 + 56 - 560}px`);
  });

  it("closes when the X button is clicked", () => {
    const onOpenChange = renderWidget(true);
    // When open, both the launcher (aria-label "Close assistant", hidden via
    // `display:none` in the real UI but still in the DOM) and the header's X
    // button share the accessible name, so disambiguate by DOM order: launcher
    // first, then the X inside the header.
    fireEvent.click(screen.getAllByRole("button", { name: "Close assistant" })[1]!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("links to the full-page chat", () => {
    renderWidget(true);
    const link = screen.getByRole("link", { name: /open full chat/i });
    expect(link.getAttribute("href")).toBe("/assistant");
  });

  it("toggles open when the launcher is clicked", () => {
    const onOpenChange = renderWidget(false);
    fireEvent.click(screen.getByTestId("assistant-widget-launcher"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("starts a drag on the launcher only after real movement", () => {
    const capture = vi.fn();
    HTMLElement.prototype.setPointerCapture = capture;
    renderWidget(false);
    const launcher = screen.getByTestId("assistant-widget-launcher");
    fireEvent.pointerDown(launcher, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(capture).not.toHaveBeenCalled();
    fireEvent.pointerMove(launcher, { pointerId: 1, clientX: 140, clientY: 120 });
    expect(capture).toHaveBeenCalled();
  });
});
