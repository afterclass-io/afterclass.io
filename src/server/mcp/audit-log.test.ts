import { describe, expect, it, vi } from "vitest";
import { appendAuditLog } from "./audit-log";

describe("appendAuditLog", () => {
  it("logs a single-line JSON record scrubbed of bearer tokens", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      appendAuditLog({
        userId: "u1",
        tool: "upsert-bid",
        args: { classId: "cl1", shareToken: "s", notes: "secret plan" },
        result: "ok",
      });
      expect(log).toHaveBeenCalledTimes(1);
      const line = log.mock.calls[0]?.[0] as string;
      expect(line).toContain("[audit:write]");
      expect(line).toContain('"tool":"upsert-bid"');
      expect(line).not.toContain("secret plan");
      expect(line).not.toContain('"shareToken"');
    } finally {
      log.mockRestore();
    }
  });

  it("never throws on unserializable input", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(() =>
        appendAuditLog({
          userId: "u1",
          tool: "x",
          args: circular,
          result: "ok",
        }),
      ).not.toThrow();
    } finally {
      log.mockRestore();
    }
  });
});
