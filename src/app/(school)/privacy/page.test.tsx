// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next/link renders a plain anchor under jsdom - mock it to keep navigation inert.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("renders the privacy policy with AI processor disclosure", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeTruthy();
    // Provider-generic disclosure (no vendor names anywhere on the page):
    // training warning, no per-provider links.
    expect(
      screen.getByText(/may train on prompts/, { exact: false }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /DeepSeek|Google|Meta|z\.ai/i }),
    ).toBeNull();
  });

  it("cross-links to /terms", () => {
    render(<PrivacyPage />);
    const link = screen.getByRole("link", { name: "terms of service" });
    expect(link.getAttribute("href")).toBe("/terms");
  });
});
