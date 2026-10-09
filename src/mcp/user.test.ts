import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { usersFindUnique, usersFindFirst } = vi.hoisted(() => ({
  usersFindUnique: vi.fn() as Mock,
  usersFindFirst: vi.fn() as Mock,
}));

// `server-only` is a Next.js build-time guard that throws when imported outside a
// Next.js server bundle. `./user` -> `@/server/mcp/caller` imports it, so stub it as
// a no-op (same pattern as `src/server/mcp/caller.test.ts` and `acad-term.test.ts`).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    users: {
      findUnique: usersFindUnique,
      findFirst: usersFindFirst,
    },
  },
}));

import { resolveMcpUser, buildToolContext } from "./user";

const row = {
  id: "supa-1",
  email: "a@x.com",
  username: "user_a",
  isVerified: true,
  universityId: "uni-1",
  firstName: "A",
  lastName: "X",
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("resolveMcpUser", () => {
  beforeEach(() => {
    usersFindUnique.mockReset();
    usersFindFirst.mockReset();
  });

  it("resolves by id when row id matches auth.user.id", async () => {
    usersFindFirst.mockResolvedValue(row);
    await expect(
      resolveMcpUser({ user: { id: "supa-1", email: "a@x.com", amr: [] } }),
    ).resolves.toMatchObject({ id: "supa-1", email: "a@x.com" });
    expect(usersFindFirst).toHaveBeenCalledWith({
      where: { OR: [{ supabaseUserId: "supa-1" }, { id: "supa-1" }] },
    });
  });

  it("resolves by supabaseUserId when row id differs from auth.user.id (Google user)", async () => {
    const googleRow = {
      ...row,
      id: "legacy-local-id",
      supabaseUserId: "supa-google-uid",
    };
    usersFindFirst.mockResolvedValue(googleRow);
    await expect(
      resolveMcpUser({
        user: { id: "supa-google-uid", email: "a@x.com", amr: [] },
      }),
    ).resolves.toMatchObject({ id: "legacy-local-id", email: "a@x.com" });
    expect(usersFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ supabaseUserId: "supa-google-uid" }, { id: "supa-google-uid" }],
      },
    });
  });

  it("returns undefined when the lookup misses (no email fallback — Supabase carries no verified-email claim)", async () => {
    usersFindFirst.mockResolvedValue(null);
    await expect(
      resolveMcpUser({ user: { id: "ghost", email: "a@x.com", amr: [] } }),
    ).resolves.toBeUndefined();
    expect(usersFindFirst).toHaveBeenCalledTimes(1);
    expect(usersFindFirst).toHaveBeenCalledWith({
      where: { OR: [{ supabaseUserId: "ghost" }, { id: "ghost" }] },
    });
  });

  it("returns undefined with no identity", async () => {
    await expect(resolveMcpUser({})).resolves.toBeUndefined();
    expect(usersFindFirst).not.toHaveBeenCalled();
  });

  it("returns undefined when auth is falsy", async () => {
    await expect(resolveMcpUser(null)).resolves.toBeUndefined();
    await expect(resolveMcpUser(undefined)).resolves.toBeUndefined();
  });
});

describe("buildToolContext", () => {
  describe("auth bridging", () => {
    beforeEach(() => {
      usersFindUnique.mockReset();
      usersFindFirst.mockReset();
      vi.unstubAllEnvs();
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("resolves via ctx.auth.user.id (v2 Supabase)", async () => {
      usersFindFirst.mockResolvedValue(row);
      await expect(
        buildToolContext({
          auth: { user: { id: "supa-1", email: "a@x.com", amr: [] } as never },
        } as never),
      ).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindFirst).toHaveBeenCalledWith({
        where: { OR: [{ supabaseUserId: "supa-1" }, { id: "supa-1" }] },
      });
    });
  });

  describe("buildToolContext dev bypass", () => {
    beforeEach(() => {
      usersFindUnique.mockReset();
      usersFindFirst.mockReset();
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
      await expect(buildToolContext({} as never)).resolves.toMatchObject({
        user: { id: "supa-1" },
      });
      expect(usersFindUnique).toHaveBeenCalledWith({
        where: { email: "test_hash_pwd@smu.edu.sg" },
      });
    });

    it("honors MCP_DEV_USER_EMAIL override", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      vi.stubEnv("MCP_DEV_USER_EMAIL", "dev@override.com");
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({} as never)).resolves.toMatchObject({
        user: { id: "supa-1" },
      });
      expect(usersFindUnique).toHaveBeenCalledWith({
        where: { email: "dev@override.com" },
      });
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

    it("resolves the dev user when NODE_ENV is unset and MCP_DEV_BYPASS=true (mcp-use dev inherits shell env)", async () => {
      vi.stubEnv("NODE_ENV", undefined);
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      delete process.env.MCP_DEV_USER_EMAIL;
      usersFindUnique.mockResolvedValue(row);
      await expect(buildToolContext({} as never)).resolves.toMatchObject({
        user: { id: "supa-1" },
      });
      expect(usersFindUnique).toHaveBeenCalledWith({
        where: { email: "test_hash_pwd@smu.edu.sg" },
      });
    });

    it("fail-closed when NODE_ENV is empty-string even with bypass enabled", async () => {
      vi.stubEnv("NODE_ENV", "");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      await expect(buildToolContext({} as never)).resolves.toBeUndefined();
      expect(usersFindUnique).not.toHaveBeenCalled();
    });

    it("real identity still wins over the bypass (token path unchanged)", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      usersFindFirst.mockResolvedValue(row);
      await expect(
        buildToolContext({
          auth: { user: { id: "supa-1", amr: [] } as never },
        } as never),
      ).resolves.toMatchObject({ user: { id: "supa-1" } });
      expect(usersFindFirst).toHaveBeenCalledWith({
        where: { OR: [{ supabaseUserId: "supa-1" }, { id: "supa-1" }] },
      });
      expect(usersFindFirst).toHaveBeenCalledTimes(1);
    });
  });
});
