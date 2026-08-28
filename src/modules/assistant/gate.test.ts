import { describe, expect, it } from "vitest";
import { parseGateError } from "./gate";

describe("parseGateError", () => {
  it("parses quota from an AI SDK APIError message", () => {
    expect(parseGateError(new Error('[POST /api/chat] 403: {"gate":"quota"}'))).toBe("quota");
  });
  it("parses spend from a bare JSON body", () => {
    expect(parseGateError(new Error('{"gate":"spend"}'))).toBe("spend");
  });
  it("returns null for unrelated errors", () => {
    expect(parseGateError(new Error("Network request failed"))).toBeNull();
    expect(parseGateError(null)).toBeNull();
    expect(parseGateError(undefined)).toBeNull();
  });
});
