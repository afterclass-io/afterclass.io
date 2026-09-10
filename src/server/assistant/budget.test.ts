// src/server/assistant/budget.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { checkAndIncrementMock } = vi.hoisted(() => ({
  checkAndIncrementMock: vi.fn() as Mock,
}));

vi.mock("./ratelimit", () => ({
  checkAndIncrement: checkAndIncrementMock,
}));

import { checkBudget } from "./budget";

describe("checkBudget", () => {
  it("rejects non-positive limits instead of global-429", async () => {
    await expect(
      checkBudget(
        { user: { id: "u1" } },
        { prefix: "t", limit: -1, windowMs: 60000, kind: "read" },
      ),
    ).rejects.toThrow(/limit/i);
  });

  it("derives the bucket key from prefix + user id", async () => {
    checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    const res = await checkBudget(
      { user: { id: "u1" } },
      { prefix: "chat-write", limit: 10, windowMs: 60_000, kind: "write" },
    );
    expect(checkAndIncrementMock).toHaveBeenCalledWith("chat-write:u1", 10, 1);
    expect(res.ok).toBe(true);
  });
});
