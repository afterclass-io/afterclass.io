// src/server/mcp/tools/bid-write-helpers.test.ts
import { describe, expect, it } from "vitest";
import { buildTermMap } from "./bid-write-helpers";

describe("buildTermMap", () => {
  it("indexes listMine rows by classId|windowId", () => {
    const mine = [
      {
        classId: "c1",
        bidWindowId: 7,
        bidWindow: { acadTermId: "AY202627T1" },
      },
      { classId: "c2", bidWindowId: 7, bidWindow: { acadTermId: null } },
    ];
    const m = buildTermMap(mine);
    expect(m.get("c1|7")).toBe("AY202627T1");
    expect(m.get("c2|7")).toBeUndefined();
  });
});
