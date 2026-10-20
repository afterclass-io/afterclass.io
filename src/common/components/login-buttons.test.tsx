// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { CoreLayoutLoginButton } from "./core-layout-login-button";
import { LockedOverlay } from "./locked-overlay";

let mockPathname: string | null = null;
let mockSearch = "";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({
    start: vi.fn(),
    done: vi.fn(),
  }),
}));

describe("Login CTA href formatting", () => {
  beforeEach(() => {
    mockPathname = null;
    mockSearch = "";
    mockPush.mockClear();
  });

  describe("CoreLayoutLoginButton", () => {
    it("renders fallback login href when pathname is null", () => {
      mockPathname = null;
      const { container } = render(<CoreLayoutLoginButton />);
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/account/auth/login");
    });

    it("renders encoded callbackUrl when pathname is present and navigates on click", () => {
      mockPathname = "/course/CS101?sort=recent";
      const { container } = render(<CoreLayoutLoginButton />);
      const link = container.querySelector("a");
      const expectedHref =
        "/account/auth/login?callbackUrl=%2Fcourse%2FCS101%3Fsort%3Drecent";
      expect(link?.getAttribute("href")).toBe(expectedHref);
      expect(link?.getAttribute("href")).not.toContain("[object Object]");

      if (link) {
        fireEvent.click(link);
        expect(mockPush).toHaveBeenCalledWith(expectedHref);
        expect(mockPush).not.toHaveBeenCalledWith("[object Object]");
      }
    });
  });

  describe("LockedOverlay", () => {
    it("keeps the query string in the callbackUrl", () => {
      mockPathname = "/professor/john-doe";
      mockSearch = "course=CS101";
      const { container } = render(<LockedOverlay ctaType="review" />);
      expect(container.querySelector("a")?.getAttribute("href")).toBe(
        "/account/auth/login?callbackUrl=%2Fprofessor%2Fjohn-doe%3Fcourse%3DCS101",
      );
    });

    it("renders fallback login href when pathname is null", () => {
      mockPathname = null;
      const { container } = render(<LockedOverlay />);
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/account/auth/login");
    });

    it("renders encoded callbackUrl when pathname is present and navigates on click", () => {
      mockPathname = "/professor/john-doe";
      const { container } = render(<LockedOverlay ctaType="review" />);
      const link = container.querySelector("a");
      const expectedHref =
        "/account/auth/login?callbackUrl=%2Fprofessor%2Fjohn-doe";
      expect(link?.getAttribute("href")).toBe(expectedHref);
      expect(link?.getAttribute("href")).not.toContain("[object Object]");

      if (link) {
        fireEvent.click(link);
        expect(mockPush).toHaveBeenCalledWith(expectedHref);
        expect(mockPush).not.toHaveBeenCalledWith("[object Object]");
      }
    });
  });
});
