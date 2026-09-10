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

import TermsPage from "./page";

describe("TermsPage", () => {
  it("renders the terms with AI-feature limits incl. quota", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeTruthy();
    expect(screen.getByText(/monthly message\n?\s*quota/i)).toBeTruthy();
  });

  it("cross-links to /privacy", () => {
    render(<TermsPage />);
    const links = screen.getAllByRole("link", { name: "privacy policy" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/privacy");
    }
  });
});
