import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import fallbackConfig from "@/server/ecfg/config.json";

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn() }));

vi.mock("@vercel/edge-config", () => ({ getAll: getAllMock }));

import { getEdgeConfig } from "@/server/ecfg/edge-config";

const validStore = {
  enablePasswordLogin: true,
  enableContentModeration: false,
  enableCmdkTooltip: false,
  enableReviewEventsTracking: false,
  enableReviewSort: false,
  enableReviewFilter: false,
  enableReviewReactions: false,
  chat: { quotaPerMonth: 55 },
};

describe("getEdgeConfig", () => {
  let warnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    getAllMock.mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns a fully valid store unchanged", async () => {
    getAllMock.mockResolvedValue(validStore);

    const config = await getEdgeConfig();

    expect(config).toMatchObject({
      ...validStore,
      chat: { quotaPerMonth: 55 },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("keeps every other store value when one required flag is missing", async () => {
    const store: Partial<typeof validStore> = { ...validStore };
    delete store.enableReviewSort;
    getAllMock.mockResolvedValue(store);

    const config = await getEdgeConfig();

    expect(config.enableReviewSort).toBe(fallbackConfig.enableReviewSort);
    expect(config.enableCmdkTooltip).toBe(false);
    expect(config.enableReviewFilter).toBe(false);
    expect(config.enableReviewReactions).toBe(false);
    expect(config.enablePasswordLogin).toBe(true);
    expect(config.enableContentModeration).toBe(false);
    expect(config.chat?.quotaPerMonth).toBe(55);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("enableReviewSort");
  });

  it("keeps every other store value when one flag is not a boolean", async () => {
    getAllMock.mockResolvedValue({ ...validStore, enableReviewFilter: "yes" });

    const config = await getEdgeConfig();

    expect(config.enableReviewFilter).toBe(fallbackConfig.enableReviewFilter);
    expect(config.enableReviewSort).toBe(false);
    expect(config.enableCmdkTooltip).toBe(false);
    expect(config.chat?.quotaPerMonth).toBe(55);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("enableReviewFilter");
  });

  it("warns once per bad key", async () => {
    getAllMock.mockResolvedValue({
      ...validStore,
      enableReviewFilter: 1,
      enableCmdkTooltip: null,
    });

    await getEdgeConfig();

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it("returns the config.json values for an empty store", async () => {
    getAllMock.mockResolvedValue({});

    const config = await getEdgeConfig();

    expect(config).toMatchObject({
      enablePasswordLogin: fallbackConfig.enablePasswordLogin,
      enableContentModeration: fallbackConfig.enableContentModeration,
      enableCmdkTooltip: fallbackConfig.enableCmdkTooltip,
      enableReviewEventsTracking: fallbackConfig.enableReviewEventsTracking,
      enableReviewSort: fallbackConfig.enableReviewSort,
      enableReviewFilter: fallbackConfig.enableReviewFilter,
      enableReviewReactions: fallbackConfig.enableReviewReactions,
    });
    expect(config.chat).toMatchObject(fallbackConfig.chat);
  });

  it("returns the config.json values when the fetch fails", async () => {
    getAllMock.mockRejectedValue(new Error("network down"));

    const config = await getEdgeConfig();

    expect(config).toMatchObject({
      enableReviewSort: fallbackConfig.enableReviewSort,
      enablePasswordLogin: fallbackConfig.enablePasswordLogin,
    });
    expect(config.chat).toMatchObject(fallbackConfig.chat);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("returns the config.json values when the store is not an object", async () => {
    getAllMock.mockResolvedValue(undefined);

    const config = await getEdgeConfig();

    expect(config.enableReviewSort).toBe(fallbackConfig.enableReviewSort);
  });
});
