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

// eslint-disable-next-line @typescript-eslint/unbound-method -- the callback is a plain function that does not use this
const signIn = authConfig.callbacks.signIn;
// eslint-disable-next-line @typescript-eslint/unbound-method -- the callback is a plain function that does not use this
const jwt = authConfig.callbacks.jwt;

describe("authConfig email domain matching", () => {
  beforeEach(() => {
    usersFindUnique.mockReset();
    usersCreate.mockReset();
    usersUpdate.mockReset();
    unisFindMany.mockReset();
    linkMock.mockReset();

    usersFindUnique.mockResolvedValue(null);
    unisFindMany.mockResolvedValue([
      { id: 1, domains: [{ domain: "smu.edu.sg" }] },
    ]);
  });

  it("resolves false for google sign-in with non-matching suffix domain", async () => {
    const result = await signIn({
      account: { provider: "google" },
      profile: { email: "a@evilsmu.edu.sg", email_verified: true },
    } as never);
    expect(result).toBe(false);
  });

  it("resolves true for google sign-in with matching subdomain", async () => {
    const result = await signIn({
      account: { provider: "google" },
      profile: { email: "a@scis.smu.edu.sg", email_verified: true },
    } as never);
    expect(result).toBe(true);
  });

  it("rejects in jwt callback with Google account and non-matching domain when user does not exist", async () => {
    await expect(
      jwt({
        token: { sub: "provider-sub" },
        user: { email: "a@evilsmu.edu.sg" },
        account: { provider: "google" },
      } as never),
    ).rejects.toThrow("Email not found in database");
  });
});
