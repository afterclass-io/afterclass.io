// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

/** jsdom has no matchMedia; stand in a minimal one and return its listener set. */
function stubMatchMedia() {
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return listeners;
}

afterEach(() => vi.unstubAllGlobals());

describe("useIsMobile", () => {
  it("is true below the 1250px breakpoint", () => {
    stubMatchMedia();
    window.innerWidth = 800;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("is false at or above the breakpoint", () => {
    stubMatchMedia();
    window.innerWidth = 1300;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("is false at exactly the breakpoint (strict <)", () => {
    stubMatchMedia();
    window.innerWidth = 1250;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("re-reads the width when the media query reports a change", () => {
    const listeners = stubMatchMedia();
    window.innerWidth = 1300;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      window.innerWidth = 500;
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
