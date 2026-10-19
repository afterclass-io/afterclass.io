import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    users: { findUnique: vi.fn() },
    universities: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/server/supabase", () => ({
  signInWithEmail: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
}));

import { authConfig } from "./config";

describe("authConfig GoogleProvider configuration", () => {
  it("configures Google provider with prompt=select_account to prevent accidental auto login", () => {
    const googleProvider = authConfig.providers.find(
      (p) =>
        typeof p === "object" && p !== null && "id" in p && p.id === "google",
    ) as { options?: Record<string, unknown> } | undefined;

    expect(googleProvider).toBeDefined();
    expect(googleProvider?.options).toMatchObject({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    });
  });
});
