import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { getEdgeConfigMock, usersFindUnique, signInWithEmailMock } = vi.hoisted(
  () => ({
    getEdgeConfigMock: vi.fn() as Mock,
    usersFindUnique: vi.fn() as Mock,
    signInWithEmailMock: vi.fn() as Mock,
  }),
);

vi.mock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
  getEdgeConfig: getEdgeConfigMock,
}));

vi.mock("@/server/db", () => ({
  db: {
    users: { findUnique: usersFindUnique },
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
    signInWithEmailMock.mockReset();
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
