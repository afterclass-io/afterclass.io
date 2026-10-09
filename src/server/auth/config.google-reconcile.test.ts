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
  captureException: vi.fn(),
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
  supabaseUserId: null,
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
    const updated = { ...legacyRow, supabaseUserId: "supa-uid" };
    usersUpdate.mockResolvedValue(updated);

    const token = await jwt(googleParams());

    expect(usersUpdate).toHaveBeenCalledWith({
      where: { id: "random-uuid" },
      data: { supabaseUserId: "supa-uid" },
    });
    expect(token?.sub).toBe("random-uuid");
    expect(token?.supabaseAccessToken).toBe("supa-access");
    expect(token?.googleLinkFailed).toBe(false);
  });

  it("backfills Google names in the same write as the id reconcile", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce(null);
    const updated = {
      ...legacyRow,
      supabaseUserId: "supa-uid",
      firstName: "Jordan",
      lastName: "Teo",
    };
    usersUpdate.mockResolvedValue(updated);

    const token = await jwt(
      googleParams({
        profile: {
          email: "a@smu.edu.sg",
          given_name: "Jordan",
          family_name: "Teo",
        },
      }),
    );

    expect(usersUpdate).toHaveBeenCalledTimes(1);
    expect(usersUpdate).toHaveBeenCalledWith({
      where: { id: "random-uuid" },
      data: {
        supabaseUserId: "supa-uid",
        firstName: "Jordan",
        lastName: "Teo",
      },
    });
    expect(token?.sub).toBe("random-uuid");
    expect(token?.user).toMatchObject({ firstName: "Jordan", lastName: "Teo" });
  });

  it("never includes an id key in the reconcile update payload", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce(null);
    usersUpdate.mockResolvedValue({ ...legacyRow, supabaseUserId: "supa-uid" });

    await jwt(googleParams());

    expect(usersUpdate).toHaveBeenCalledTimes(1);
    const updateCall = usersUpdate.mock.calls[0]?.[0] as
      { data?: Record<string, unknown> } | undefined;
    expect(updateCall?.data).not.toHaveProperty("id");
  });

  it("does not run reconcile update when dbUser.supabaseUserId already matches the link id", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    const alreadyLinkedRow = {
      ...legacyRow,
      supabaseUserId: "supa-uid",
    };
    usersFindUnique.mockResolvedValue(alreadyLinkedRow);

    const token = await jwt(googleParams());

    expect(usersUpdate).not.toHaveBeenCalled();
    expect(token?.sub).toBe("random-uuid");
    expect(token?.supabaseAccessToken).toBe("supa-access");
    expect(token?.googleLinkFailed).toBe(false);
  });

  it("sets both id and supabaseUserId when creating a new user on link success", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique.mockResolvedValue(null);
    unisFindMany.mockResolvedValue([
      { id: 1, domains: [{ domain: "smu.edu.sg" }] },
    ]);
    const createdRow = {
      ...legacyRow,
      id: "supa-uid",
      supabaseUserId: "supa-uid",
    };
    usersCreate.mockResolvedValue(createdRow);

    const token = await jwt(googleParams());

    expect(usersCreate).toHaveBeenCalledTimes(1);
    const createCall = usersCreate.mock.calls[0]?.[0] as
      { data?: Record<string, unknown> } | undefined;
    expect(createCall?.data?.id).toBe("supa-uid");
    expect(createCall?.data?.supabaseUserId).toBe("supa-uid");
    expect(token?.sub).toBe("supa-uid");
    expect(token?.user).not.toHaveProperty("deprecatedPasswordDigest");
    expect(token?.user).not.toHaveProperty("supabaseUserId");
  });

  it("returns a token without throwing when the reconcile update rejects (e.g. unique clash)", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce(null);
    usersUpdate.mockRejectedValueOnce(
      new Error("Unique constraint failed on the fields: (`supabase_user_id`)"),
    );

    const token = await jwt(googleParams());

    expect(token).toBeDefined();
    expect(token?.sub).toBe("random-uuid");
    expect(token?.user).toMatchObject({ id: "random-uuid" });
  });

  it("clears the Supabase tokens when the reconcile write hits a unique violation", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce(null);
    usersUpdate.mockRejectedValueOnce(
      new Error("Unique constraint failed on the fields: (`supabase_user_id`)"),
    );

    const token = await jwt(googleParams());

    expect(token?.sub).toBe("random-uuid");
    expect(token?.supabaseAccessToken).toBeNull();
    expect(token?.supabaseRefreshToken).toBeNull();
    expect(token?.supabaseExpiresAt).toBeNull();
  });

  it("backfills names alone when no reconcile is needed", async () => {
    linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "random-uuid",
    });
    usersFindUnique.mockResolvedValue(legacyRow);
    usersUpdate.mockResolvedValue({ ...legacyRow, firstName: "Jordan" });

    const token = await jwt(
      googleParams({
        profile: { email: "a@smu.edu.sg", given_name: "Jordan" },
      }),
    );

    expect(usersUpdate).toHaveBeenCalledTimes(1);
    expect(usersUpdate).toHaveBeenCalledWith({
      where: { id: "random-uuid" },
      data: { firstName: "Jordan" },
    });
    expect(token?.user).toMatchObject({ firstName: "Jordan" });
  });

  it("never overwrites a stored name", async () => {
    linkMock.mockRejectedValue(new Error("skip link"));
    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      usersFindUnique.mockResolvedValue({
        ...legacyRow,
        firstName: "Stored",
        lastName: "Name",
      });

      await jwt(
        googleParams({
          profile: {
            email: "a@smu.edu.sg",
            given_name: "Jordan",
            family_name: "Teo",
          },
        }),
      );

      expect(usersUpdate).not.toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
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
    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      linkMock.mockRejectedValue(new Error("bad token"));
      usersFindUnique.mockResolvedValue(legacyRow);

      const token = await jwt(googleParams());

      expect(token?.sub).toBe("random-uuid");
      expect(token?.supabaseAccessToken).toBeNull();
      expect(token?.googleLinkFailed).toBe(true);
      expect(usersUpdate).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalledWith(
        "[auth][google-link-failed]",
        expect.anything(),
      );
    } finally {
      errSpy.mockRestore();
    }
  });
});
