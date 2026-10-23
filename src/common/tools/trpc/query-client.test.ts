import { describe, it, expect } from "vitest";
import { createQueryClient, shouldRetryQuery } from "./query-client";

const trpcError = (code: string) => ({ data: { code } });

describe("shouldRetryQuery", () => {
  it.each(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "BAD_REQUEST"])(
    "never retries a deterministic %s error",
    (code) => {
      expect(shouldRetryQuery(0, trpcError(code))).toBe(false);
    },
  );

  it("retries transient tRPC errors up to 3 times", () => {
    const error = trpcError("INTERNAL_SERVER_ERROR");
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(true);
    expect(shouldRetryQuery(3, error)).toBe(false);
  });

  it("retries errors that carry no tRPC code (e.g. network failures)", () => {
    expect(shouldRetryQuery(0, new Error("fetch failed"))).toBe(true);
    expect(shouldRetryQuery(0, null)).toBe(true);
  });
});

describe("createQueryClient", () => {
  it("does not refetch queries on window focus by default", () => {
    const queries = createQueryClient().getDefaultOptions().queries;
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });
});
