import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { usersFindUnique } = vi.hoisted(() => ({ usersFindUnique: vi.fn() as Mock }));

// `server-only` is a Next.js build-time guard that throws when imported outside a
// Next.js server bundle. `./user` -> `@/server/mcp/caller` imports it, so stub it as
// a no-op (same pattern as `src/server/mcp/caller.test.ts` and `acad-term.test.ts`).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: { users: { findUnique: usersFindUnique } },
}));

import { resolveMcpUser } from "./user";

const row = {
  id: "supa-1", email: "a@x.com", username: "user_a", isVerified: true,
  universityId: "uni-1", firstName: "A", lastName: "X", telegramId: null,
  photoUrl: null, facultyId: null, createdAt: new Date(), updatedAt: new Date(),
};

describe("resolveMcpUser", () => {
  beforeEach(() => usersFindUnique.mockReset());

  it("resolves by Supabase user id", async () => {
    usersFindUnique.mockResolvedValue(row);
    await expect(resolveMcpUser({ userId: "supa-1" })).resolves.toMatchObject({ id: "supa-1", email: "a@x.com" });
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
  });

  it("falls back to email when id lookup misses (verified email)", async () => {
    usersFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    await expect(resolveMcpUser({ userId: "ghost", email: "a@x.com", email_verified: true })).resolves.toMatchObject({ id: "supa-1" });
    expect(usersFindUnique).toHaveBeenNthCalledWith(2, { where: { email: "a@x.com" } });
  });

  it("falls back to email via email_confirmed_at when email_verified is absent", async () => {
    usersFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    await expect(resolveMcpUser({ userId: "ghost", email: "a@x.com", email_confirmed_at: "2026-01-01T00:00:00Z" })).resolves.toMatchObject({ id: "supa-1" });
    expect(usersFindUnique).toHaveBeenNthCalledWith(2, { where: { email: "a@x.com" } });
  });

  it("does NOT fall back to email when the token email is unverified", async () => {
    usersFindUnique.mockResolvedValueOnce(null);
    await expect(resolveMcpUser({ userId: "ghost", email: "a@x.com" })).resolves.toBeUndefined();
    // must not have queried by email at all - the fallback is blocked on unverified
    expect(usersFindUnique).toHaveBeenCalledTimes(1);
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "ghost" } });

    usersFindUnique.mockReset();
    usersFindUnique.mockResolvedValueOnce(null);
    await expect(resolveMcpUser({ userId: "ghost", email: "a@x.com", email_verified: false })).resolves.toBeUndefined();
    expect(usersFindUnique).toHaveBeenCalledTimes(1);

    usersFindUnique.mockReset();
    usersFindUnique.mockResolvedValueOnce(null);
    await expect(resolveMcpUser({ email: "a@x.com", email_verified: false })).resolves.toBeUndefined();
    expect(usersFindUnique).not.toHaveBeenCalled();
  });

  it("returns undefined when the user does not exist", async () => {
    usersFindUnique.mockResolvedValue(null);
    await expect(resolveMcpUser({ userId: "ghost" })).resolves.toBeUndefined();
  });

  it("returns undefined with no identity", async () => {
    await expect(resolveMcpUser({})).resolves.toBeUndefined();
    expect(usersFindUnique).not.toHaveBeenCalled();
  });
});
