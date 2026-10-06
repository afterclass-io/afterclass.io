import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ after: vi.fn() }));

vi.mock("next/server", () => ({ after: m.after }));

import { runAfterResponse } from "./after-response";

beforeEach(() => {
  m.after.mockReset();
});

describe("runAfterResponse", () => {
  it("hands the task to after() and does not run it inline", () => {
    const task = vi.fn().mockResolvedValue(undefined);
    runAfterResponse(task);
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.after).toHaveBeenCalledWith(task);
    expect(task).not.toHaveBeenCalled();
  });

  it("runs the task inline, un-awaited, when after() throws", () => {
    m.after.mockImplementation(() => {
      throw new Error("outside a request scope");
    });
    let finish: () => void = () => undefined;
    const task = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    expect(() => runAfterResponse(task)).not.toThrow();
    expect(task).toHaveBeenCalledTimes(1);
    finish();
  });
});
