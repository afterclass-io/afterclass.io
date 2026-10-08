import { describe, expect, it } from "vitest";

import {
  getCacheControlForTrpcRequest,
  PUBLIC_CACHEABLE_PROCEDURES,
} from "./caching";

const PRIVATE_CACHE_VALUE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

describe("caching.reviews (guarding review procedures cache safety)", () => {
  it("PUBLIC_CACHEABLE_PROCEDURES contains the three public review list procedures", () => {
    expect(PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getAll")).toBe(true);
    expect(PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getByCourseCode")).toBe(
      true,
    );
    expect(PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getByProfSlug")).toBe(true);
  });

  it("PUBLIC_CACHEABLE_PROCEDURES contains none of the protected review procedures or getById or getEngagement", () => {
    expect(PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getAllProtected")).toBe(
      false,
    );
    expect(
      PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getByCourseCodeProtected"),
    ).toBe(false);
    expect(
      PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getByProfSlugProtected"),
    ).toBe(false);
    expect(PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getById")).toBe(false);
    expect(PUBLIC_CACHEABLE_PROCEDURES.has("reviews.getEngagement")).toBe(
      false,
    );
  });

  it("getCacheControlForTrpcRequest for paths: ['reviews.getAllProtected'] returns the private value", () => {
    const headers = getCacheControlForTrpcRequest({
      type: "query",
      paths: ["reviews.getAllProtected"],
      errors: [],
    });
    expect(headers).toEqual({
      "Cache-Control": PRIVATE_CACHE_VALUE,
      "CDN-Cache-Control": PRIVATE_CACHE_VALUE,
      "Vercel-CDN-Cache-Control": PRIVATE_CACHE_VALUE,
    });
  });
});
