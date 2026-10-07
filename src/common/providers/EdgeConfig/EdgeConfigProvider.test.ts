import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn() }));

vi.mock("@vercel/edge-config", () => ({ getAll: getAllMock }));

import { getEdgeConfig } from "./EdgeConfigProvider";

describe("getEdgeConfig enableContentModeration", () => {
  beforeEach(() => {
    // Remote store unreachable: the app falls back to config.json (flag off).
    getAllMock.mockRejectedValue(new Error("Unauthorized"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stays off in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await getEdgeConfig()).enableContentModeration).toBe(false);
  });

  it("stays off in production even when the env override is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_CONTENT_MODERATION", "true");
    expect((await getEdgeConfig()).enableContentModeration).toBe(false);
  });

  it("is on in development by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await getEdgeConfig()).enableContentModeration).toBe(true);
  });

  it("can be turned off in development with ENABLE_CONTENT_MODERATION=false", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_CONTENT_MODERATION", "false");
    expect((await getEdgeConfig()).enableContentModeration).toBe(false);
  });
});
