import { describe, expect, it } from "vitest";
import { errorMessage, errText, jsonText, okText, type ToolResult } from "./types";

describe("mcp result helpers", () => {
  it("okText builds a text CallToolResult", () => {
    expect(okText("hello")).toEqual({ content: [{ type: "text", text: "hello" }] });
  });

  it("jsonText pretty-prints JSON", () => {
    const r = jsonText({ a: 1 });
    expect(r).toMatchObject({ content: [{ type: "text" }] });
    expect((r.content[0] as { text: string }).text).toContain('"a"');
  });

  it("jsonText does not throw on circular references", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => jsonText(circular)).not.toThrow();
    const r = jsonText(circular);
    expect(r.content[0]).toHaveProperty("type", "text");
  });

  it("errText marks isError", () => {
    expect(errText("boom").isError).toBe(true);
  });

  it("errorMessage extracts Error messages and falls back to String", () => {
    expect(errorMessage(new Error("x"))).toBe("x");
    expect(errorMessage("raw")).toBe("raw");
    expect(errorMessage({})).toContain("[object Object]");
  });

  it("ToolResult supports optional widgetProps alongside text content", () => {
    const r: ToolResult = { content: [{ type: "text", text: "shown in widget" }], widgetProps: { feedUrl: "https://x/api/ical/tok" } };
    expect(r.widgetProps?.feedUrl).toContain("/api/ical/");
  });
});
