// src/server/assistant/budget.test.ts
import { describe, expect, it } from "vitest";
import { checkBudget } from "./budget";
describe("checkBudget", () => {
  it("rejects non-positive limits instead of global-429", async () => {
    await expect(
      checkBudget({ key: "t", limit: -1, windowMs: 60000 } as never),
    ).rejects.toThrow(/limit/i);
  });
});
