import { describe, expect, it } from "vitest";

import { getCacheControlForTrpcRequest } from "./caching";

const PUBLIC_CACHE_VALUE =
  "public, s-maxage=1800, stale-while-revalidate=86400";
const PRIVATE_CACHE_VALUE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

describe("getCacheControlForTrpcRequest signed-in callers", () => {
  const request = {
    type: "query",
    paths: ["courses.getByCourseCode", "reviews.getAll"],
    errors: [],
  } as const;

  it("returns private headers for signed-in callers of cacheable paths", () => {
    const headers = getCacheControlForTrpcRequest({
      ...request,
      signedIn: true,
    });
    expect(headers).toEqual({
      "Cache-Control": PRIVATE_CACHE_VALUE,
      "CDN-Cache-Control": PRIVATE_CACHE_VALUE,
      "Vercel-CDN-Cache-Control": PRIVATE_CACHE_VALUE,
    });
  });

  it("returns public headers for anonymous callers of cacheable paths", () => {
    const headers = getCacheControlForTrpcRequest({
      ...request,
      signedIn: false,
    });
    expect(headers["Cache-Control"]).toBe(PUBLIC_CACHE_VALUE);
  });
});
