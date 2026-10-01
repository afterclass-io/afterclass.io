import { describe, expect, it } from "vitest";

import {
  getCacheControlForTrpcRequest,
  PUBLIC_CACHEABLE_PROCEDURES,
} from "./caching";

const PUBLIC_CACHE_VALUE =
  "public, s-maxage=1800, stale-while-revalidate=86400";
const PRIVATE_CACHE_VALUE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

describe("getCacheControlForTrpcRequest", () => {
  it("returns public cache headers for cacheable queries", () => {
    for (const path of PUBLIC_CACHEABLE_PROCEDURES) {
      const headers = getCacheControlForTrpcRequest({
        type: "query",
        paths: [path],
        errors: [],
      });
      expect(headers).toEqual({
        "Cache-Control": PUBLIC_CACHE_VALUE,
        "CDN-Cache-Control": PUBLIC_CACHE_VALUE,
        "Vercel-CDN-Cache-Control": PUBLIC_CACHE_VALUE,
      });
    }
  });

  it("returns public cache headers when all batched paths are cacheable", () => {
    const headers = getCacheControlForTrpcRequest({
      type: "query",
      paths: ["courses.getByCourseCode", "reviews.getMetadataForCourse"],
      errors: [],
    });
    expect(headers["Cache-Control"]).toBe(PUBLIC_CACHE_VALUE);
  });

  it("returns private headers for mutations", () => {
    const headers = getCacheControlForTrpcRequest({
      type: "mutation",
      paths: ["courses.getByCourseCode"],
      errors: [],
    });
    expect(headers).toEqual({
      "Cache-Control": PRIVATE_CACHE_VALUE,
      "CDN-Cache-Control": PRIVATE_CACHE_VALUE,
      "Vercel-CDN-Cache-Control": PRIVATE_CACHE_VALUE,
    });
  });

  it("returns private headers for uncacheable queries", () => {
    const headers = getCacheControlForTrpcRequest({
      type: "query",
      paths: ["timetable.getArrangement"],
      errors: [],
    });
    expect(headers["Cache-Control"]).toBe(PRIVATE_CACHE_VALUE);
  });

  it("returns private headers when any batched path is uncacheable", () => {
    const headers = getCacheControlForTrpcRequest({
      type: "query",
      paths: ["courses.getByCourseCode", "timetable.getArrangement"],
      errors: [],
    });
    expect(headers["Cache-Control"]).toBe(PRIVATE_CACHE_VALUE);
  });

  it("returns private headers for queries with errors", () => {
    const headers = getCacheControlForTrpcRequest({
      type: "query",
      paths: ["courses.getByCourseCode"],
      errors: [new Error("boom")],
    });
    expect(headers["Cache-Control"]).toBe(PRIVATE_CACHE_VALUE);
  });

  it("returns private headers when paths is empty or undefined", () => {
    expect(
      getCacheControlForTrpcRequest({ type: "query", paths: [], errors: [] })[
        "Cache-Control"
      ],
    ).toBe(PRIVATE_CACHE_VALUE);
    expect(
      getCacheControlForTrpcRequest({
        type: "query",
        paths: undefined,
        errors: [],
      })["Cache-Control"],
    ).toBe(PRIVATE_CACHE_VALUE);
  });
});
