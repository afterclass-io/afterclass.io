import { describe, it, expect } from "vitest";
import { MCPServer } from "mcp-use";
import { z } from "zod";

describe("mcp-use v2 boot", () => {
  it("constructs a server and registers a tool with inputSchema/outputSchema", () => {
    const server = new MCPServer({ name: "boot-check", version: "0.0.0" });
    const myTool = server.tool(
      { name: "echo", inputSchema: z.object({ q: z.string() }), outputSchema: z.object({ out: z.string() }) },
      async ({ q }) => ({ content: [{ type: "text", text: q }], structuredContent: { out: q } }),
    );
    expect(myTool.name).toBe("echo");
  });
});
