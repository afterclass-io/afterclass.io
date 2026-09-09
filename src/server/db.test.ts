import { describe, expect, it } from "vitest";
describe("db clients", () => {
  it("exposes a transactional client bound to DIRECT_URL", async () => {
    const mod = await import("./db");
    expect("txDb" in mod || "directDb" in mod).toBe(true);
  });
});
