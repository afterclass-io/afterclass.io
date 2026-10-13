import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const sentry = vi.hoisted(() => ({
  instrumentSupabaseClient: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentry);

import { instrumentSupabase } from "./instrument";

const fakeClient = { auth: {} } as unknown as SupabaseClient;

describe("instrumentSupabase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("instruments the client without sending operation data", () => {
    const result = instrumentSupabase(fakeClient);

    expect(sentry.instrumentSupabaseClient).toHaveBeenCalledTimes(1);
    expect(sentry.instrumentSupabaseClient).toHaveBeenCalledWith(fakeClient, {
      sendOperationData: false,
    });
    expect(result).toBe(fakeClient);
  });

  it("returns the client when instrumentation throws", () => {
    sentry.instrumentSupabaseClient.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    expect(instrumentSupabase(fakeClient)).toBe(fakeClient);
  });
});
