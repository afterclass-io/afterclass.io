// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

// `void act(...)`: the sync-callback form of act() flushes synchronously and
// returns a thenable that is intentionally not awaited. Do NOT rewrite to
// `await act(async () => ...)` — under fake timers that form can hang.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("returns the initial value synchronously", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 200));
    expect(result.current).toBe("a");
  });

  it("adopts the latest value only after the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 200),
      { initialProps: { v: "a" } },
    );

    rerender({ v: "b" });
    void act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe("a");

    void act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
  });

  it("restarts the timer when the value changes again before it fires", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 200),
      { initialProps: { v: "a" } },
    );

    rerender({ v: "b" });
    void act(() => vi.advanceTimersByTime(150));
    rerender({ v: "c" });
    void act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe("a"); // the "b" timer was cleared

    void act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe("c");
  });
});
