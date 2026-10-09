import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const {
  getEdgeConfigMock,
  usersFindUnique,
  usersUpdate,
  usersCreate,
  signInWithEmailMock,
  bcryptCompareMock,
} = vi.hoisted(() => ({
  getEdgeConfigMock: vi.fn() as Mock,
  usersFindUnique: vi.fn() as Mock,
  usersUpdate: vi.fn() as Mock,
  usersCreate: vi.fn() as Mock,
  signInWithEmailMock: vi.fn() as Mock,
  bcryptCompareMock: vi.fn() as Mock,
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

vi.mock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
  getEdgeConfig: getEdgeConfigMock,
}));

vi.mock("@/server/db", () => ({
  db: {
    users: {
      findUnique: usersFindUnique,
      update: usersUpdate,
      create: usersCreate,
    },
    universities: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/server/supabase", () => ({
  signInWithEmail: signInWithEmailMock,
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
}));

import { authConfig } from "./config";

function credentialsProvider() {
  const provider = authConfig.providers.find(
    (p) => (p as { id?: string }).id === "credentials",
  ) as unknown as {
    authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
    options?: {
      authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
    };
  };
  // next-auth wraps Credentials config: the real `authorize` lives on
  // `options`; the top-level `authorize` is a `() => null` stub.
  const authorize = provider?.options?.authorize ?? provider?.authorize;
  if (!authorize) throw new Error("credentials provider missing");
  return { authorize };
}

describe("Credentials authorize enablePasswordLogin gate", () => {
  beforeEach(() => {
    getEdgeConfigMock.mockReset();
    usersFindUnique.mockReset();
    usersUpdate.mockReset();
    usersCreate.mockReset();
    signInWithEmailMock.mockReset();
    bcryptCompareMock.mockReset();
    usersFindUnique.mockResolvedValue(null);
    signInWithEmailMock.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthError", message: "Invalid login credentials" },
    });
    vi.unstubAllEnvs();
  });

  it("returns null without querying db when flag is false in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ENABLE_PASSWORD_LOGIN;
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    const result = await credentialsProvider().authorize({
      email: "test@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(usersFindUnique).not.toHaveBeenCalled();
    expect(signInWithEmailMock).not.toHaveBeenCalled();
  });

  it("proceeds to db lookup when flag is true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ENABLE_PASSWORD_LOGIN;
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });

    const result = await credentialsProvider().authorize({
      email: "notfound@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(usersFindUnique).toHaveBeenCalled();
  });

  it("allows dev testing when NODE_ENV is development and ENABLE_PASSWORD_LOGIN is not 'false'", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.ENABLE_PASSWORD_LOGIN;
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    const result = await credentialsProvider().authorize({
      email: "notfound@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(usersFindUnique).toHaveBeenCalled();
  });

  it("rejects when ENABLE_PASSWORD_LOGIN is 'false' in dev even if Edge Config enables it", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.ENABLE_PASSWORD_LOGIN = "false";
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });

    const result = await credentialsProvider().authorize({
      email: "notfound@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(usersFindUnique).not.toHaveBeenCalled();
    expect(signInWithEmailMock).not.toHaveBeenCalled();
  });
});

describe("Credentials authorize email verification gate", () => {
  beforeEach(() => {
    getEdgeConfigMock.mockReset();
    usersFindUnique.mockReset();
    usersUpdate.mockReset();
    usersCreate.mockReset();
    signInWithEmailMock.mockReset();
    bcryptCompareMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.ENABLE_PASSWORD_LOGIN;
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });
  });

  it("returns null for legacy user with matching password and isVerified false", async () => {
    usersFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@smu.edu.sg",
      deprecatedPasswordDigest: "hash",
      isVerified: false,
    });
    bcryptCompareMock.mockResolvedValue(true);

    const result = await credentialsProvider().authorize({
      email: "test@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
  });

  it("returns the user for legacy verified user with matching password", async () => {
    const legacyUser = {
      id: "u1",
      email: "test@smu.edu.sg",
      deprecatedPasswordDigest: "hash",
      isVerified: true,
    };
    usersFindUnique.mockResolvedValue(legacyUser);
    bcryptCompareMock.mockResolvedValue(true);

    const result = await credentialsProvider().authorize({
      email: "test@smu.edu.sg",
      password: "password123",
    });

    expect(result).toEqual(legacyUser);
  });

  it("returns null and does not update when Supabase sign-in ok, confirmed_at missing, and existing unverified user", async () => {
    usersFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@smu.edu.sg",
      isVerified: false,
      deprecatedPasswordDigest: null,
    });
    signInWithEmailMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "test@smu.edu.sg", confirmed_at: null },
        session: null,
      },
      error: null,
    });

    const result = await credentialsProvider().authorize({
      email: "test@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(usersUpdate).not.toHaveBeenCalled();
  });

  it("calls users.update with isVerified true and returns user with isVerified true when Supabase sign-in ok, confirmed_at set, and existing unverified user", async () => {
    usersFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@smu.edu.sg",
      isVerified: false,
      deprecatedPasswordDigest: null,
    });
    signInWithEmailMock.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@smu.edu.sg",
          confirmed_at: "2026-01-01T00:00:00Z",
        },
        session: { access_token: "supa-tok" },
      },
      error: null,
    });
    const updatedUser = {
      id: "u1",
      email: "test@smu.edu.sg",
      isVerified: true,
      deprecatedPasswordDigest: null,
    };
    usersUpdate.mockResolvedValue(updatedUser);

    const result = await credentialsProvider().authorize({
      email: "test@smu.edu.sg",
      password: "password123",
    });

    expect(usersUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isVerified: true },
    });
    expect(result).toEqual({
      ...updatedUser,
      supabaseAccessToken: "supa-tok",
    });
  });

  it("returns null and does not call users.create when Supabase sign-in ok, no DB user, and unconfirmed", async () => {
    usersFindUnique.mockResolvedValue(null);
    signInWithEmailMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "test@smu.edu.sg", confirmed_at: null },
        session: null,
      },
      error: null,
    });

    const result = await credentialsProvider().authorize({
      email: "test@smu.edu.sg",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(usersCreate).not.toHaveBeenCalled();
  });
});
