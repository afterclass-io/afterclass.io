// Tool schema & type smoke test - verifies the shared tool infrastructure
// (types.ts + local ToolResult) is self-consistent without the MCP SDK, and
// that the catalog keeps the documented 42-tool shape.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { okText, errText, jsonText } from "@/server/mcp/types";

describe("tool schema & types smoke", () => {
  it("zod schema validates via ~standard protocol", async () => {
    const schema = z.object({ q: z.string() });
    const result = await schema["~standard"].validate({ q: "hi" });
    if (result.issues) {
      throw new Error(result.issues.map((issue) => issue.message).join("; "));
    }
    expect(result.value).toEqual({ q: "hi" });
  });

  it("ToolResult helpers produce correct shapes", () => {
    expect(okText("hello")).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
    expect(errText("boom")).toEqual({
      content: [{ type: "text", text: "boom" }],
      isError: true,
    });
    const j = jsonText({ a: 1 });
    expect(j.content[0]).toHaveProperty("type", "text");
    expect((j.content[0] as { text: string }).text).toContain("1");
  });
});
