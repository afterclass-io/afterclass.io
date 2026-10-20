// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthWall } from "./auth-wall";

let mockPathname: string | null = "/bidding/analytics";
let mockSearchParams: { toString: () => string } | null = null;

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe("AuthWall component", () => {
  beforeEach(() => {
    mockPathname = "/bidding/analytics";
    mockSearchParams = null;
  });

  it("renders full variant by default with generated feature title and login link", () => {
    render(<AuthWall feature="bidding analytics" />);

    expect(
      screen.getByText("Sign in to view bidding analytics"),
    ).not.toBeNull();
    expect(
      screen.getByText("Sign in with your university account to continue."),
    ).not.toBeNull();
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe(
      "/account/auth/login?callbackUrl=%2Fbidding%2Fanalytics",
    );
  });

  it("preserves searchParams in the callbackUrl", () => {
    mockPathname = "/timetable";
    mockSearchParams = { toString: () => "term=2026-T1&view=compact" };

    render(<AuthWall feature="your timetable" />);

    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe(
      "/account/auth/login?callbackUrl=%2Ftimetable%3Fterm%3D2026-T1%26view%3Dcompact",
    );
  });

  it("respects explicit callbackUrl and title overrides", () => {
    render(
      <AuthWall
        title="Custom Sign In Title"
        description="Custom description microcopy."
        callbackUrl="/custom-return"
        ctaLabel="Log In"
      />,
    );

    expect(screen.getByText("Custom Sign In Title")).not.toBeNull();
    expect(screen.getByText("Custom description microcopy.")).not.toBeNull();
    const link = screen.getByRole("link", { name: "Log In" });
    expect(link.getAttribute("href")).toBe(
      "/account/auth/login?callbackUrl=%2Fcustom-return",
    );
  });

  it("renders overlay variant for backdrop blur lockouts", () => {
    const { container } = render(
      <AuthWall variant="overlay" feature="ratings" />,
    );

    const overlay = container.querySelector('[data-test="auth-wall-overlay"]');
    expect(overlay).not.toBeNull();
    expect(screen.getByText("Sign in to view ratings")).not.toBeNull();
  });

  it("renders compact variant for drawers and toolbars", () => {
    const { container } = render(
      <AuthWall
        variant="compact"
        feature="class sections"
        description="Sign in to view timings."
      />,
    );

    const compact = container.querySelector('[data-test="auth-wall-compact"]');
    expect(compact).not.toBeNull();
    expect(screen.getByText("Sign in to view class sections")).not.toBeNull();
    expect(screen.getByText("Sign in to view timings.")).not.toBeNull();
  });

  it("renders card variant for section boxes", () => {
    const { container } = render(
      <AuthWall variant="card" feature="bidding predictions" />,
    );

    const card = container.querySelector('[data-test="auth-wall-card"]');
    expect(card).not.toBeNull();
    expect(
      screen.getByText("Sign in to view bidding predictions"),
    ).not.toBeNull();
  });

  it("renders inline variant for text prompts", () => {
    const { container } = render(
      <AuthWall variant="inline" feature="details" />,
    );

    const inline = container.querySelector('[data-test="auth-wall-inline"]');
    expect(inline).not.toBeNull();
    expect(screen.getByText("Sign in to view details")).not.toBeNull();
  });
});
