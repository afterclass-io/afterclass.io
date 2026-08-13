import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";

import { getCurrentWindowOrNull } from "./safe";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("getCurrentWindowOrNull", () => {
  it("passes through a resolved window", async () => {
    const window = { id: 1, acadTermId: "T1" };
    await expect(
      getCurrentWindowOrNull(() => Promise.resolve(window as never)),
    ).resolves.toBe(window);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("returns null and reports to Sentry when the call rejects", async () => {
    const boom = new Error("P1001: can't reach database server");
    await expect(
      getCurrentWindowOrNull(() => Promise.reject(boom)),
    ).resolves.toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
  });
});
