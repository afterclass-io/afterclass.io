import { describe, expect, it } from "vitest";
import { parseChatError, parseGateError } from "./gate";

describe("parseGateError", () => {
  it("parses quota from an AI SDK APIError message", () => {
    expect(
      parseGateError(new Error('[POST /api/chat] 403: {"gate":"quota"}')),
    ).toBe("quota");
  });
  it("parses consent from an AI SDK APIError message", () => {
    expect(
      parseGateError(new Error('[POST /api/chat] 403: {"gate":"consent"}')),
    ).toBe("consent");
  });
  it("returns null for unrelated errors", () => {
    expect(parseGateError(new Error("Network request failed"))).toBeNull();
    expect(parseGateError(null)).toBeNull();
    expect(parseGateError(undefined)).toBeNull();
  });
});

describe("parseChatError", () => {
  it("returns null for quota/consent gates (bubble must not show)", () => {
    expect(
      parseChatError(new Error('[POST /api/chat] 403: {"gate":"quota"}')),
    ).toBeNull();
    expect(
      parseChatError(new Error('[POST /api/chat] 403: {"gate":"consent"}')),
    ).toBeNull();
  });

  it("classifies rate-limited (429 Rate limit exceeded)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 429: Rate limit exceeded")),
    ).toBe("rate-limited");
  });

  it("classifies turn-in-flight (429 previous turn still running)", () => {
    expect(
      parseChatError(
        new Error("[POST /api/chat] 429: A previous turn is still running"),
      ),
    ).toBe("turn-in-flight");
  });

  it("classifies too-large (413 Request too large)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 413: Request too large")),
    ).toBe("too-large");
  });

  it("classifies invalid-request (400 Invalid request body)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 400: Invalid request body")),
    ).toBe("invalid-request");
  });

  it("classifies unavailable (503 Assistant unavailable)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 503: Assistant unavailable")),
    ).toBe("unavailable");
  });

  it("classifies unavailable for 500 Assistant unavailable (sync failure after reservation)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 500: Assistant unavailable")),
    ).toBe("unavailable");
  });

  it("classifies disabled (503 Assistant disabled kill-switch)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 503: Assistant disabled")),
    ).toBe("disabled");
  });

  it("classifies unauthorized (401 Unauthorized)", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 401: Unauthorized")),
    ).toBe("unauthorized");
  });

  it("classifies generic 500 / network / unknown as failed", () => {
    expect(
      parseChatError(new Error("[POST /api/chat] 500: upstream failure")),
    ).toBe("failed");
    expect(parseChatError(new Error("Network request failed"))).toBe("failed");
    expect(parseChatError(new Error("boom"))).toBe("failed");
  });

  it("returns null when there is no error", () => {
    expect(parseChatError(null)).toBeNull();
    expect(parseChatError(undefined)).toBeNull();
  });
});
