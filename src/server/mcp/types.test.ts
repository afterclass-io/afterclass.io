import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  errorMessage,
  errText,
  jsonText,
  okText,
  parseViewJson,
  type ToolResult,
} from "./types";

describe("mcp result helpers", () => {
  it("okText builds a text CallToolResult", () => {
    expect(okText("hello")).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
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

  it("errorMessage passes TRPCError messages through (coded + friendly)", () => {
    expect(
      errorMessage(
        new TRPCError({ code: "NOT_FOUND", message: "Course X not found" }),
      ),
    ).toBe("Course X not found");
    expect(errorMessage(new TRPCError({ code: "FORBIDDEN" }))).toContain(
      "FORBIDDEN",
    );
  });

  it("errorMessage maps Prisma P2002/P2003 constraint noise to a generic retry message", () => {
    const p2002 = Object.assign(
      new Error("Unique constraint failed on the fields: (`id`)"),
      {
        code: "P2002",
      },
    );
    expect(errorMessage(p2002)).toMatch(/refresh and try again/);
    expect(errorMessage(p2002)).not.toContain("Unique constraint");
    const p2003 = Object.assign(new Error("Foreign key constraint failed"), {
      code: "P2003",
    });
    expect(errorMessage(p2003)).toMatch(/refresh and try again/);
    // Raw DB text without a code is sanitized too.
    expect(
      errorMessage(new Error('duplicate key violates unique constraint "x"')),
    ).toMatch(/refresh and try again/);
  });

  it("exposes viewProps channel (no widget legacy)", async () => {
    const mod = await import("./types");
    expect("widgetProps" in mod).toBe(false);
  });

  it("exposes parseViewJson (no parseWidgetJson legacy)", async () => {
    const mod = await import("./types");
    expect("parseViewJson" in mod).toBe(true);
    expect("parseWidgetJson" in mod).toBe(false);
  });

  it("parseViewJson returns { data } on valid JSON and { raw } otherwise", () => {
    const ok = parseViewJson({
      content: [{ type: "text", text: '{"a":1}' }],
    });
    expect(ok).toEqual({ data: { a: 1 } });
    const bad = parseViewJson({
      content: [{ type: "text", text: "not json" }],
    });
    expect(bad).toEqual({ raw: "not json" });
  });

  it("ToolResult supports optional viewProps alongside text content", () => {
    const r: ToolResult = {
      content: [{ type: "text", text: "shown in view" }],
      viewProps: { feedUrl: "https://x/api/ical/tok" },
    };
    expect(r.viewProps?.feedUrl).toContain("/api/ical/");
  });
});
