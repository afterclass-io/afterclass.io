import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const m = vi.hoisted(() => ({
  usersFindUnique: vi.fn() as Mock,
  usersUpdate: vi.fn() as Mock,
  linkMock: vi.fn() as Mock,
  captureException: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: {
    users: {
      findUnique: m.usersFindUnique,
      create: vi.fn(),
      update: m.usersUpdate,
    },
    universities: { findMany: vi.fn() },
  },
}));
vi.mock("./supabase-link", () => ({ exchangeGoogleIdToken: m.linkMock }));
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: m.captureException,
}));

import { authConfig } from "./config";

// eslint-disable-next-line @typescript-eslint/unbound-method -- the callback is a plain function that does not use this
const jwt = authConfig.callbacks.jwt;

const legacyRow = {
  id: "random-uuid",
  email: "a@smu.edu.sg",
  username: "user_a",
  isVerified: true,
  universityId: 1,
  deprecatedPasswordDigest: null,
  supabaseUserId: null,
};

const params = {
  token: { sub: "provider-sub" },
  user: { email: "a@smu.edu.sg" },
  account: { provider: "google", id_token: "google-id-token" },
  profile: { email: "a@smu.edu.sg" },
  trigger: "signIn",
} as unknown as Parameters<NonNullable<typeof jwt>>[0];

describe("google jwt reconcile failure reporting", () => {
  beforeEach(() => {
    m.usersFindUnique.mockReset();
    m.usersUpdate.mockReset();
    m.linkMock.mockReset();
    m.captureException.mockReset();
  });

  it("sends the reconcile error to Sentry and still signs the user in", async () => {
    m.linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    m.usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce(null);
    const failure = new Error("connection reset");
    m.usersUpdate.mockRejectedValueOnce(failure);

    const token = await jwt(params);

    expect(token?.sub).toBe("random-uuid");
    expect(token?.supabaseAccessToken).toBeNull();
    expect(m.captureException).toHaveBeenCalledTimes(1);
    expect(m.captureException).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({ tags: { area: "auth.google-reconcile" } }),
    );
  });

  it("reports a Prisma error without its argument text (the email)", async () => {
    m.linkMock.mockResolvedValue({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
    m.usersFindUnique
      .mockResolvedValueOnce(legacyRow)
      .mockResolvedValueOnce(null);
    const prismaError = Object.assign(
      new Error("Invalid invocation: data: { email: a@smu.edu.sg }"),
      { name: "PrismaClientKnownRequestError", code: "P2002" },
    );
    m.usersUpdate.mockRejectedValueOnce(prismaError);

    await jwt(params);

    const [reported, options] = m.captureException.mock.calls[0] as [
      Error,
      { tags: Record<string, string> },
    ];
    expect(reported.message).toBe("PrismaClientKnownRequestError P2002");
    expect(JSON.stringify(reported)).not.toContain("smu.edu.sg");
    expect(options.tags).toEqual({ area: "auth.google-reconcile" });
  });
});
