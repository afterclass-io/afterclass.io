import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { usersFindUnique, usersCreate, usersUpdate, unisFindMany, linkMock } =
  vi.hoisted(() => ({
    usersFindUnique: vi.fn() as Mock,
    usersCreate: vi.fn() as Mock,
    usersUpdate: vi.fn() as Mock,
    unisFindMany: vi.fn() as Mock,
    linkMock: vi.fn(),
  }));

vi.mock("@/server/db", () => ({
  db: {
    users: {
      findUnique: usersFindUnique,
      create: usersCreate,
      update: usersUpdate,
    },
    universities: { findMany: unisFindMany },
  },
}));

vi.mock("./supabase-link", () => ({
  exchangeGoogleIdToken: linkMock,
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
}));

import { authConfig } from "./config";

// eslint-disable-next-line @typescript-eslint/unbound-method
const jwt = authConfig.callbacks.jwt;

function googleParams(over: Record<string, unknown> = {}) {
  return {
    token: { sub: "provider-sub" },
    user: { email: "a@smu.edu.sg" },
    account: { provider: "google", id_token: "google-id-token" },
    profile: { email: "a@smu.edu.sg", picture: "https://pic" },
    trigger: "signIn",
    ...over,
  } as unknown as Parameters<NonNullable<typeof jwt>>[0];
}

const legacyRow = {
  id: "random-uuid",
  email: "a@smu.edu.sg",
  username: "user_a",
  isVerified: true,
  universityId: 1,
  deprecatedPasswordDigest: null,
};

describe("google jwt reconcile (legacy id self-heal)", () => {
  beforeEach(() => {
    usersFindUnique.mockReset();
    usersCreate.mockReset();
    usersUpdate.mockReset();
    unisFindMany.mockReset();
    linkMock.mockReset();
  });

  it("re-points a legacy random-uuid row to the Supabase id on link success", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique
      .mockResolvedValueOnce(legacyRow) // by email
      .mockResolvedValueOnce(null); // no clash on supa id
    const updated = { ...legacyRow, id: "supa-uid" };
    usersUpdate.mockResolvedValue(updated);

    const token = await jwt(googleParams());

    expect(usersUpdate).toHaveBeenCalledWith({
      where: { email: "a@smu.edu.sg" },
      data: { id: "supa-uid" },
    });
    expect(token?.sub).toBe("supa-uid");
    expect(token?.supabaseAccessToken).toBe("supa-access");
  });

  it("clears tokens fail-closed when another row owns the Supabase id", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce({ ...legacyRow, id: "supa-uid" }); // clash

    const token = await jwt(googleParams());

    expect(usersUpdate).not.toHaveBeenCalled();
    expect(token?.supabaseAccessToken).toBeNull();
    expect(token?.supabaseRefreshToken).toBeNull();
    // Login still succeeds on the legacy row.
    expect(token?.sub).toBe("random-uuid");
  });

  it("leaves login succeeding with null tokens when the exchange throws", async () => {
    linkMock.mockRejectedValue(new Error("bad token"));
    usersFindUnique.mockResolvedValue(legacyRow);

    const token = await jwt(googleParams());

    expect(token?.sub).toBe("random-uuid");
    expect(token?.supabaseAccessToken).toBeNull();
    expect(usersUpdate).not.toHaveBeenCalled();
  });
});
