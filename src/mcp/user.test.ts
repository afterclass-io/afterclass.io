import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { usersFindUnique } = vi.hoisted(() => ({ usersFindUnique: vi.fn() as Mock }));

// `server-only` is a Next.js build-time guard that throws when imported outside a
// Next.js server bundle. `./user` -> `@/server/mcp/caller` imports it, so stub it as
// a no-op (same pattern as `src/server/mcp/caller.test.ts` and `acad-term.test.ts`).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: { users: { findUnique: usersFindUnique } },
}));

import { resolveMcpUser, buildToolContext } from "./user";

const row = {
  id: "supa-1", email: "a@x.com", username: "user_a", isVerified: true,
  universityId: "uni-1", firstName: "A", lastName: "X", telegramId: null,
  photoUrl: null, facultyId: null, createdAt: new Date(), updatedAt: new Date(),
};

describe("resolveMcpUser", () => {
  beforeEach(() => usersFindUnique.mockReset());

  it("resolves by Supabase user id (v2 shape: auth.user.id)", async () => {
    usersFindUnique.mockResolvedValue(row);
    await expect(resolveMcpUser({ user: { id: "supa-1", email: "a@x.com", amr: [] } })).resolves.toMatchObject({ id: "supa-1", email: "a@x.com" });
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
  });

  it("still falls back to legacy userId for test callers", async () => {
    usersFindUnique.mockResolvedValue(row);
    await expect(resolveMcpUser({ userId: "supa-1" })).resolves.toMatchObject({ id: "supa-1" });
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
  });

  it("resolves by legacy userId (original test path)", async () => {
    usersFindUnique.mockResolvedValue(row);
    await expect(resolveMcpUser({ userId: "supa-1" })).resolves.toMatchObject({ id: "supa-1", email: "a@x.com" });
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
  });

  it("prefers v2 id over legacy userId when both present", async () => {
    usersFindUnique.mockResolvedValue(row);
    await expect(resolveMcpUser({ user: { id: "supa-1", amr: [] }, userId: "ghost" })).resolves.toMatchObject({ id: "supa-1" });
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
    // should not have queried ghost
    expect(usersFindUnique).toHaveBeenCalledTimes(1);
  });

  it("falls back to email when id lookup misses (verified email) via v2 shape", async () => {
    usersFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    // v2 id misses, then verified email fallback via legacy email_verified
    await expect(resolveMcpUser({ user: { id: "ghost", email: "a@x.com", amr: [] }, email_verified: true })).resolves.toMatchObject({ id: "supa-1" });
    expect(usersFindUnique).toHaveBeenNthCalledWith(2, { where: { email: "a@x.com" } });
  });

  it("falls back to email when legacy id lookup misses (verified email)", async () => {
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

  it("does NOT fall back to v2 email when unverified (Supabase never verified)", async () => {
    usersFindUnique.mockResolvedValueOnce(null);
    await expect(resolveMcpUser({ user: { id: "ghost", email: "a@x.com", amr: [] } })).resolves.toBeUndefined();
    expect(usersFindUnique).toHaveBeenCalledTimes(1);
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "ghost" } });
  });

  it("returns undefined when the user does not exist", async () => {
    usersFindUnique.mockResolvedValue(null);
    await expect(resolveMcpUser({ userId: "ghost" })).resolves.toBeUndefined();
  });

  it("returns undefined with no identity", async () => {
    await expect(resolveMcpUser({})).resolves.toBeUndefined();
    expect(usersFindUnique).not.toHaveBeenCalled();
  });

  it("returns undefined when auth is falsy", async () => {
    await expect(resolveMcpUser(null as never)).resolves.toBeUndefined();
    await expect(resolveMcpUser(undefined as never)).resolves.toBeUndefined();
  });
});

describe("buildToolContext", () => {
  describe("legacy auth bridging", () => {
    beforeEach(() => {
      usersFindUnique.mockReset();
      vi.unstubAllEnvs();
    });
    afterEach(() => { vi.unstubAllEnvs(); });

    it("resolves via legacy userId when passed flat auth", async () => {
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({ userId: "supa-1" } as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
    });

    it("resolves via ctx.auth.user.id (v2 Supabase)", async () => {
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({ auth: { user: { id: "supa-1", email: "a@x.com", amr: [] } as never } } as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
    });

  });

  describe("buildToolContext dev bypass", () => {
    beforeEach(() => {
      usersFindUnique.mockReset();
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("resolves the dev user when NODE_ENV=development and MCP_DEV_BYPASS=true", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      delete process.env.MCP_DEV_USER_EMAIL;
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({} as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { email: "test_hash_pwd@smu.edu.sg" } });
    });

    it("honors MCP_DEV_USER_EMAIL override", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      vi.stubEnv("MCP_DEV_USER_EMAIL", "dev@override.com");
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({} as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { email: "dev@override.com" } });
    });

    it("fail-closed when bypass enabled but dev user missing from DB", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      usersFindUnique.mockResolvedValue(null);
      await expect(buildToolContext({} as never)).resolves.toBeUndefined();
    });

    it("fail-closed when MCP_DEV_BYPASS is not exactly 'true'", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "1");
      await expect(buildToolContext({} as never)).resolves.toBeUndefined();
      expect(usersFindUnique).not.toHaveBeenCalled();
    });

    it("fail-closed in production even with bypass enabled", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      await expect(buildToolContext({} as never)).resolves.toBeUndefined();
      expect(usersFindUnique).not.toHaveBeenCalled();
    });

    it("fail-closed when NODE_ENV is unset but bypass enabled (mcp-use dev inherits shell env)", async () => {
      vi.stubEnv("NODE_ENV", undefined);
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      delete process.env.MCP_DEV_USER_EMAIL;
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({} as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { email: "test_hash_pwd@smu.edu.sg" } });
    });

    it("real identity still wins over the bypass (token path unchanged)", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({ userId: "supa-1" } as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledTimes(1);
    });

    it("real v2 identity wins over bypass as well", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({ auth: { user: { id: "supa-1", amr: [] } as never } } as never)).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "supa-1" } });
      expect(usersFindUnique).toHaveBeenCalledTimes(1);
    });
  });
});
