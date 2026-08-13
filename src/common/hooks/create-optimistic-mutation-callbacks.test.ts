import { describe, expect, it, vi } from "vitest";
import { createOptimisticMutationCallbacks } from "./create-optimistic-mutation-callbacks";

function setup() {
  const cancel = vi.fn().mockResolvedValue(undefined);
  const getSnapshot = vi.fn().mockReturnValue({ entries: [] });
  const applyOptimistic = vi.fn();
  const restoreSnapshot = vi.fn();
  const invalidate = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  return {
    cancel,
    getSnapshot,
    applyOptimistic,
    restoreSnapshot,
    invalidate,
    onError,
    callbacks: createOptimisticMutationCallbacks<
      { entries: unknown[] },
      { entries: unknown[] }
    >({
      cancel,
      getSnapshot,
      applyOptimistic,
      restoreSnapshot,
      invalidate,
      onError,
    }),
  };
}

describe("createOptimisticMutationCallbacks", () => {
  it("snapshots then applies the optimistic update on mutate", async () => {
    const s = setup();
    const vars = { entries: [{ id: "new" }] };
    const ctx = await s.callbacks.onMutate(vars);
    expect(s.cancel).toHaveBeenCalled();
    expect(s.applyOptimistic).toHaveBeenCalledWith(vars);
    expect(ctx).toEqual({ prev: { entries: [] } });
  });

  it("restores the snapshot and reports the error on failure", () => {
    const s = setup();
    const ctx = { prev: { entries: [] } };
    s.callbacks.onError({ message: "boom" }, { entries: [] }, ctx);
    expect(s.restoreSnapshot).toHaveBeenCalledWith({ entries: [] });
    expect(s.onError).toHaveBeenCalledWith("boom");
  });

  it("invalidates on settle", () => {
    const s = setup();
    s.callbacks.onSettled();
    expect(s.invalidate).toHaveBeenCalled();
  });
});
