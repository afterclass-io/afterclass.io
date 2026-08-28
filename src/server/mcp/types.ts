import type { z } from "zod";
import type { SessionUser } from "@/server/auth/config";
import type { createCaller } from "@/server/api/root";

/** A tRPC server-side caller, typed like `createCaller(...)`. */
export type RouterCaller = ReturnType<typeof createCaller>;

/** Everything a tool handler needs. `caller` is already scoped to `user`. */
export interface ToolContext {
  user: SessionUser;
  caller: RouterCaller;
}

/** The result shape a tool handler returns. Mirrors the MCP SDK's CallToolResult. */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/** A single AI-visible skill. `run` must never throw; return errText instead. */
export interface McpTool<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  readOnly?: boolean;
  // Method syntax (not an arrow-property) keeps `TSchema` non-contravariant under
  // `strictFunctionTypes` so `McpTool<ZodObject<...>>` stays assignable to
  // `McpTool<z.ZodType>` (needed for `allTools: McpTool[]`). No runtime difference.
  run(ctx: ToolContext, input: z.infer<TSchema>): Promise<ToolResult>;

  /** Optional MCP Apps widget name (rendered in ChatGPT/Claude) and props extractor. */
  widgetName?: string;
  toWidgetProps?: (result: ToolResult) => Record<string, unknown>;
}

export const okText = (text: string): ToolResult => ({
  content: [{ type: "text", text }],
});

export const jsonText = (value: unknown): ToolResult => {
  try {
    return okText(JSON.stringify(value, null, 2));
  } catch {
    return okText(String(value));
  }
};

export const errText = (text: string): ToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
