import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  NEXTAUTH_SECRET: undefined as string | undefined,
  AUTH_SECRET: undefined as string | undefined,
  DATABASE_URL: "postgresql://user:db-password@localhost:5432/db",
}));

vi.mock("@/env", () => ({ env: envMock }));

import { hash } from "./hash";
import { secret } from "./secret";

describe("secret", () => {
  beforeEach(() => {
    envMock.NEXTAUTH_SECRET = undefined;
    envMock.AUTH_SECRET = undefined;
  });

  it("hashes the app secret", () => {
    envMock.NEXTAUTH_SECRET = "app-secret";
    expect(secret()).toBe(hash("app-secret"));
  });

  it("accepts the AUTH_SECRET alias", () => {
    envMock.AUTH_SECRET = "alias-secret";
    expect(secret()).toBe(hash("alias-secret"));
  });

  it("never falls back to the database URL", () => {
    expect(() => secret()).toThrow(/NEXTAUTH_SECRET/);
  });
});
