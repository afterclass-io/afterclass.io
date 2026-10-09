import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { getEdgeConfigMock } = vi.hoisted(() => ({
  getEdgeConfigMock: vi.fn() as Mock,
}));

vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: getEdgeConfigMock,
}));

import { isPasswordLoginEnabled } from "./password-login";

describe("isPasswordLoginEnabled", () => {
  beforeEach(() => {
    getEdgeConfigMock.mockReset();
    vi.unstubAllEnvs();
    delete process.env.ENABLE_PASSWORD_LOGIN;
    delete process.env.VERCEL_ENV;
  });

  it("returns false in production when Edge Config flag is false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(false);
  });

  it("returns true in production when Edge Config flag is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });

    expect(await isPasswordLoginEnabled()).toBe(true);
  });

  it("returns false in production when getEdgeConfig rejects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getEdgeConfigMock.mockRejectedValue(new Error("Edge Config unreachable"));

    expect(await isPasswordLoginEnabled()).toBe(false);
  });

  it("returns true in development when ENABLE_PASSWORD_LOGIN is unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(true);
  });

  it("returns false in development when ENABLE_PASSWORD_LOGIN is false", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "false");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });

    expect(await isPasswordLoginEnabled()).toBe(false);
  });

  it("returns true in preview when ENABLE_PASSWORD_LOGIN is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "true");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(true);
  });

  it("returns false on Vercel production when ENABLE_PASSWORD_LOGIN is true but Edge Config is false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "true");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(false);
  });

  it("returns true on Vercel production when ENABLE_PASSWORD_LOGIN is true and Edge Config is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "true");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });

    expect(await isPasswordLoginEnabled()).toBe(true);
  });

  it("returns false in preview when ENABLE_PASSWORD_LOGIN is false and Edge Config is false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "false");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(false);
  });

  it("returns true in preview when ENABLE_PASSWORD_LOGIN is false but Edge Config is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "false");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: true });

    expect(await isPasswordLoginEnabled()).toBe(true);
  });

  it("returns false on Vercel production even if NODE_ENV is development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "production");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(false);
  });

  it("returns true in test environment when ENABLE_PASSWORD_LOGIN is true", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "true");
    getEdgeConfigMock.mockResolvedValue({ enablePasswordLogin: false });

    expect(await isPasswordLoginEnabled()).toBe(true);
  });
});
