// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTransitionMount } from "./use-transition-mount";

beforeEach(() => {
  vi.useFakeTimers();
  // rand(min, max) collapses to `min` — deterministic increments.
  vi.spyOn(Math, "random").mockReturnValue(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useTransitionMount", () => {
  it("starts idle at 0", () => {
    const { result } = renderHook(() => useTransitionMount());
    expect(result.current.state).toBe("initial");
    expect(result.current.value).toBe(0);
  });

  it("ticks progress forward while in-progress", () => {
    const { result } = renderHook(() => useTransitionMount());

    act(() => result.current.start());
    expect(result.current.state).toBe("in-progress");

    act(() => {
      vi.advanceTimersByTime(750);
    }); // from 0 -> +15
    expect(result.current.value).toBe(15);

    act(() => {
      vi.advanceTimersByTime(750);
    }); // 15 < 50 -> +rand(1,10) === +1
    expect(result.current.value).toBe(16);
  });

  it("done() snaps to 100 and settles on 'complete'", () => {
    const { result } = renderHook(() => useTransitionMount());

    act(() => result.current.start());
    act(() => result.current.done());

    expect(result.current.value).toBe(100);
    expect(result.current.state).toBe("complete");
  });

  it("done() straight from initial also completes", () => {
    const { result } = renderHook(() => useTransitionMount());

    act(() => result.current.done());

    expect(result.current.value).toBe(100);
    expect(result.current.state).toBe("complete");
  });

  it("reset() returns to initial and 0", () => {
    const { result } = renderHook(() => useTransitionMount());

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(750);
    });
    act(() => result.current.reset());

    expect(result.current.state).toBe("initial");
    expect(result.current.value).toBe(0);
  });
});
