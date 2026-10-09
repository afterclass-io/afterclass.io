import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
  browserProfilingIntegration: vi.fn(() => ({ name: "BrowserProfiling" })),
  captureRouterTransitionStart: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentry);

type InitOptions = {
  tracesSampleRate: number;
  profilesSampleRate: number;
  replaysOnErrorSampleRate: number;
};

async function loadInit(nodeEnv: string): Promise<InitOptions> {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  await import("../instrumentation-client");
  return sentry.init.mock.calls[0]?.[0] as InitOptions;
}

describe("client Sentry configuration (issue 505 invariants)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it("masks all replay text and blocks all media", async () => {
    await loadInit("production");

    expect(sentry.replayIntegration).toHaveBeenCalledWith({
      maskAllText: true,
      blockAllMedia: true,
    });
  });

  it("samples traces and profiles below full rate in production", async () => {
    const options = await loadInit("production");

    expect(options.tracesSampleRate).toBeLessThan(1);
    expect(options.profilesSampleRate).toBeLessThan(1);
  });

  it("keeps full-rate replay when an error fires", async () => {
    const options = await loadInit("production");

    expect(options.replaysOnErrorSampleRate).toBe(1);
  });
});
