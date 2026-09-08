import { afterEach, describe, expect, it, vi } from "vitest";

// `server-only` guard (Task 12: env-gate.ts carries the import) — stub as
// no-op (established pattern: register.test.ts, adapters.test.ts).
vi.mock("server-only", () => ({}));

import { isDevBypass } from "./env-gate";

describe("isDevBypass", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false in production even with flag set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(false);
  });

  it("is true in development with the explicit flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(true);
  });

  it("is false in development without the flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MCP_DEV_BYPASS", "");
    expect(isDevBypass()).toBe(false);
  });

  it("is false when NODE_ENV=test even with the flag (existing suite pins test to gated)", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(false);
  });

  it("is true when NODE_ENV is unset and the flag is set (bare mcp-use dev inherits shell env)", () => {
    vi.stubEnv("NODE_ENV", undefined);
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(true);
  });

  it("is false when NODE_ENV is empty-string even with the flag (fail closed)", () => {
    vi.stubEnv("NODE_ENV", "");
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(false);
  });

  it("is false when NODE_ENV is missing/invalid even with the flag (fail closed → prod)", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(false);
    vi.stubEnv("NODE_ENV", "PRODUCTION");
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(false);
  });

  it("rejects truthy-but-inexact bypass flags (only exactly 'true' passes)", () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const flag of ["1", "TRUE", "True", "yes"]) {
      vi.stubEnv("MCP_DEV_BYPASS", flag);
      expect(isDevBypass()).toBe(false);
    }
    vi.stubEnv("MCP_DEV_BYPASS", "true");
    expect(isDevBypass()).toBe(true);
  });
});
