// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useDebouncedOptimisticMutate } from "./use-debounced-optimistic-mutate";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedOptimisticMutate", () => {
  it("applies the optimistic update on every call without delay", () => {
    const mutate = vi.fn();
    const applyOptimistic = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedOptimisticMutate<number>(mutate, applyOptimistic),
    );

    act(() => {
      result.current(1);
      result.current(2);
    });

    expect(applyOptimistic.mock.calls).toEqual([[1], [2]]);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("sends only the last variables once calls stop for 300ms", () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedOptimisticMutate<number>(mutate, vi.fn()),
    );

    act(() => {
      result.current(1);
      vi.advanceTimersByTime(200);
      result.current(2);
      vi.advanceTimersByTime(299);
    });
    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(2);
  });

  it("honours a custom delay", () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedOptimisticMutate<string>(mutate, vi.fn(), 50),
    );

    act(() => {
      result.current("x");
      vi.advanceTimersByTime(50);
    });

    expect(mutate).toHaveBeenCalledWith("x");
  });
});
