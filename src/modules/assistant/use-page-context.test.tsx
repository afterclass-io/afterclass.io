// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_CONTEXT_MAX_LEN, usePageContext } from "./use-page-context";

const { mockUsePathname, mockUseSearchParams } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
  mockUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

beforeEach(() => {
  mockUsePathname.mockReset();
  mockUseSearchParams.mockReset();
  mockUsePathname.mockReturnValue("/bidding/analytics");
  mockUseSearchParams.mockReturnValue(
    new URLSearchParams(
      "course=IS215&section=G1&classId=seed-ay202627t1-is215-g1&rounds=1A",
    ),
  );
});

describe("usePageContext", () => {
  it("returns pathname + allowlisted entity ids, excluding filter params", () => {
    const { result } = renderHook(() => usePageContext());
    expect(result.current).toEqual({
      pathname: "/bidding/analytics",
      course: "IS215",
      section: "G1",
      classId: "seed-ay202627t1-is215-g1",
    });
  });

  it("returns null on /assistant (full-page chat has no surrounding view)", () => {
    mockUsePathname.mockReturnValue("/assistant");
    mockUseSearchParams.mockReturnValue(new URLSearchParams("course=IS215"));
    const { result } = renderHook(() => usePageContext());
    expect(result.current).toBeNull();
  });

  it("returns pathname-only when no allowlisted params are present", () => {
    // DECISION: { pathname } (not null) so the model at least knows the surface.
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("rounds=1A&windows=R1"),
    );
    const { result } = renderHook(() => usePageContext());
    expect(result.current).toEqual({ pathname: "/bidding/analytics" });
  });

  it("maps the prof param to profSlug", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("prof=jCJk9X2"));
    const { result } = renderHook(() => usePageContext());
    expect(result.current).toEqual({
      pathname: "/bidding/analytics",
      profSlug: "jCJk9X2",
    });
  });

  it("trims whitespace and caps values at MAX_LEN", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams(`course=${"  IS215  "}&section=${"G".repeat(200)}`),
    );
    const { result } = renderHook(() => usePageContext());
    expect(result.current).toEqual({
      pathname: "/bidding/analytics",
      course: "IS215",
      section: "G".repeat(PAGE_CONTEXT_MAX_LEN),
    });
  });
});
