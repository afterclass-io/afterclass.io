import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  NEXTAUTH_SECRET: undefined as string | undefined,
  AUTH_SECRET: undefined as string | undefined,
}));

vi.mock("@/env", () => ({ env: envMock }));

import { resolveConsentCsrfSecret } from "@/server/supabase-consent";

import { getAuthSecret } from "./auth-secret";

describe("getAuthSecret", () => {
  beforeEach(() => {
    envMock.NEXTAUTH_SECRET = undefined;
    envMock.AUTH_SECRET = undefined;
  });

  it("prefers NEXTAUTH_SECRET over the AUTH_SECRET alias", () => {
    envMock.NEXTAUTH_SECRET = "primary";
    envMock.AUTH_SECRET = "alias";
    expect(getAuthSecret()).toBe("primary");
  });

  it("falls back to AUTH_SECRET", () => {
    envMock.AUTH_SECRET = "alias";
    expect(getAuthSecret()).toBe("alias");
  });

  it("is undefined when neither is set", () => {
    expect(getAuthSecret()).toBeUndefined();
  });

  it("feeds the consent CSRF secret from the validated env", () => {
    envMock.AUTH_SECRET = "alias";
    expect(resolveConsentCsrfSecret()).toBe("alias");
  });
});
