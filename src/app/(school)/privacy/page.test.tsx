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
    // Provider-generic disclosure (no vendor names in body copy): training
    // warning plus links to each provider's own policy.
    expect(
      screen.getByText(/may train on prompts/, { exact: false }),
    ).toBeTruthy();
    for (const name of ["DeepSeek", "Google", "Meta"]) {
      // "Meta" also appears in the Meta policy link text — any match counts.
      expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(0);
    }
  });

  it("cross-links to /terms", () => {
    render(<PrivacyPage />);
    const link = screen.getByRole("link", { name: "terms of service" });
    expect(link.getAttribute("href")).toBe("/terms");
  });
});
