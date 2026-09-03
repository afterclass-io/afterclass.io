import type { ToolResult } from "@/server/mcp/types";
import type { ZodType } from "zod";
import { buildToolContext } from "../user";

export function textResult(text: string): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  return { content: [{ type: "text" as const, text }] as Array<{ type: "text"; text: string }> };
}

export function errorResult(text: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return { isError: true as const, content: [{ type: "text" as const, text }] as Array<{ type: "text"; text: string }> };
}

export type UnwrapOk = { ok: true; data: unknown; text: string; widgetProps?: Record<string, unknown> };
export type UnwrapErr = { ok: false; error: string; text: string };

/**
 * Unwrap catalog run result into a data payload.
 * Order: result.widgetProps -> tool.toWidgetProps(result) -> JSON.parse(text) (guarded).
 * Returns ok:false with error string if JSON parsing fails.
 * `fallbackJson` controls what to parse when content text is missing (undefined/null):
 *   - "{}" for object-shaped tools (roadmap, reviews, bid-plan, explore)
 *   - "" for array-shaped / recommend tools where missing should be Invalid JSON
 */
export function unwrapResultData(
  result: ToolResult,
  tool?: { toWidgetProps?: (result: ToolResult) => unknown },
  fallbackJson = "{}",
): UnwrapOk | UnwrapErr {
  const text = result.content[0]?.text ?? "";
  const widgetProps = result.widgetProps;
  let data: unknown = widgetProps ?? (tool?.toWidgetProps ? (tool.toWidgetProps(result)) : undefined);
  if (data !== undefined) {
    return { ok: true, data, text, widgetProps };
  }
  const rawText = result.content[0]?.text;
  const jsonSource = rawText ?? fallbackJson;
  try {
    data = JSON.parse(jsonSource);
    return { ok: true, data, text, widgetProps };
  } catch (e) {
    return { ok: false, error: String(e), text };
  }
}

export function guardedParse(schema: ZodType, data: unknown): { ok: true } | { ok: false; error: string } {
  try {
    schema.parse(data);
    return { ok: true };
  } catch (e) {
    const msg = String(e);
    console.error("[mcp] Output schema validation failed", msg);
    return { ok: false, error: msg };
  }
}

export function isRawPayload(data: unknown): boolean {
  return !!data && typeof data === "object" && "raw" in (data as Record<string, unknown>);
}

/** What an object-shaped view-tool adapter returns to mcp-use. */
export type ViewToolOutcome =
  | { content: Array<{ type: "text"; text: string }>; structuredContent: unknown }
  | { content: Array<{ type: "text"; text: string }>; isError: true };

export interface RunViewToolOptions {
  ctx: unknown;
  params: unknown;
  /** The catalog tool backing this adapter (its toWidgetProps participates in unwrapping). */
  tool: { run(ctx: unknown, input: unknown): Promise<ToolResult>; toWidgetProps?: (result: ToolResult) => unknown };
  schema: ZodType;
  /** Default "{}" — pass "" for array-shaped/recommend tools where missing content must fail. */
  fallbackJson?: string;
  /** Error text when the unwrapped payload is a raw { raw } envelope. */
  rawPayloadMessage: string;
  /** Builds the model-visible summary from the validated structuredContent. */
  summarize: (data: unknown) => string;
}

/**
 * Shared pipeline for the object-shaped view-tool adapters:
 * auth → tool.run → unwrapResultData → raw-payload guard → schema guard →
 * { summary text, structuredContent }. Error envelopes mirror each adapter's
 * historical messages exactly ("Unauthorized: ...", "Tool failed", "Invalid JSON
 * from catalog", rawPayloadMessage, "Output schema validation failed").
 */
export async function runViewTool(opts: RunViewToolOptions): Promise<ViewToolOutcome> {
  const toolCtx = await buildToolContext(opts.ctx as never);
  if (!toolCtx)
    return errorResult(
      "Unauthorized: no verified identity and dev bypass is off. For local Inspector use `bun run mcp:dev` with MCP_DEV_BYPASS=true (see MCP.md).",
    );
  const result = await opts.tool.run(toolCtx, opts.params);
  if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
  const unwrapped = unwrapResultData(result, opts.tool, opts.fallbackJson);
  if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
  const structuredContent: unknown = unwrapped.data;
  if (isRawPayload(structuredContent)) return errorResult(opts.rawPayloadMessage);
  const parsed = guardedParse(opts.schema, structuredContent);
  if (!parsed.ok) return errorResult("Output schema validation failed");
  return {
    content: [{ type: "text" as const, text: opts.summarize(structuredContent) }],
    structuredContent,
  };
}
