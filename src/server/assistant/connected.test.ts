import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { listUserGrants } = vi.hoisted(() => ({ listUserGrants: vi.fn() as Mock }));
vi.mock("@/server/supabase-consent", () => ({ listUserGrants }));

import { hasConnectedAgent } from "./connected";

describe("hasConnectedAgent", () => {
  it("is false without a Supabase token", async () => {
    await expect(hasConnectedAgent("u1", undefined)).resolves.toBe(false);
    expect(listUserGrants).not.toHaveBeenCalled();
  });
  it("is false with a null Supabase token", async () => {
    await expect(hasConnectedAgent("u1", null)).resolves.toBe(false);
    expect(listUserGrants).not.toHaveBeenCalled();
  });
  it("is true when grants exist", async () => {
    listUserGrants.mockResolvedValue([{ id: "g1", client_id: "c1", scopes: [] }]);
    await expect(hasConnectedAgent("u1", "tok")).resolves.toBe(true);
  });
  it("is false when no grants", async () => {
    listUserGrants.mockResolvedValue([]);
    await expect(hasConnectedAgent("u1", "tok")).resolves.toBe(false);
  });
});
