import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/supabase-access-token", () => ({
  getSupabaseAccessToken: vi.fn(),
}));
vi.mock("@/server/supabase-consent", () => ({
  listUserGrants: vi.fn(),
  revokeUserGrant: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { listUserGrants, revokeUserGrant } from "@/server/supabase-consent";
import { revokeAgent } from "./revoke-agent";

const mockedAuth = vi.mocked(auth);
const mockedGetToken = vi.mocked(getSupabaseAccessToken);
const mockedList = vi.mocked(listUserGrants);
const mockedRevoke = vi.mocked(revokeUserGrant);

const ownerGrant = { id: "gr1", client_id: "cl1", scopes: [] };

describe("revokeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRevoke.mockResolvedValue(undefined);
    mockedList.mockResolvedValue([ownerGrant]);
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockedGetToken.mockResolvedValue("tok");
  });

  it("revokes the grant and revalidates the agents page when the user owns the grant", async () => {
    const fd = new FormData();
    fd.set("clientId", "cl1");
    await revokeAgent(fd);
    expect(mockedRevoke).toHaveBeenCalledWith("cl1", "tok");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/agents");
  });

  it("throws and does NOT call revokeUserGrant when the grant is not owned by the user", async () => {
    const fd = new FormData();
    fd.set("clientId", "cl2");
    await expect(revokeAgent(fd)).rejects.toThrow("Grant not found");
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("throws when the user is not authenticated", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const fd = new FormData();
    fd.set("clientId", "cl1");
    await expect(revokeAgent(fd)).rejects.toThrow("Not authenticated");
    expect(mockedRevoke).not.toHaveBeenCalled();
  });
});
